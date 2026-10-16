/** Phase 4E-2B-2: offline route/UI boundary tests (no Supabase connection). */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

const root = path.resolve(__dirname, '..');
const load = (name) => fs.readFileSync(path.join(root, name), 'utf8');
const routeSource = load('app/api/curriculum-developer/math-intelligence/method-preview/route.ts');
const panelSource = load('app/curriculum-developer/components/math-intelligence/StaffMathMethodPreviewPanel.tsx');
const pageSource = load('app/curriculum-developer/math-intelligence/method-preview/page.tsx');
const cssSource = load('app/curriculum-developer/components/math-intelligence/StaffMathMethodPreviewPanel.module.css');
const qid = '11111111-1111-4111-8111-111111111111';
const kid = '22222222-2222-4222-8222-222222222222';
const tid = '33333333-3333-4333-8333-333333333333';
const answerSecret = 'SECRET_ANSWER_DO_NOT_EXPOSE';

function harness({ authorised=true, data={}, preview=null }={}) {
  const called = [];
  const records = {
    math_topics:[{id:tid,subject:'math',primary_level:6}],
    math_quizzes:[{id:qid,title:'Percentage Final Challenge',status:'published',topic_id:tid,is_published:true}],
    math_quiz_questions:[{quiz_id:qid,question_id:kid,question_order:1}],
    math_questions:[{id:kid,code:'MATH-P6-TEST-001',question_type:'fraction',answer_data:{answer:answerSecret}}],
    ...data,
  };
  const client = {
    from(table) {
      called.push('from:'+table);
      const filters = [];
      const query = {
        select(columns) { called.push('select:'+table+':'+columns); return query; },
        eq(column, value) { filters.push([column,'eq',value]);return query; },
        in(column, values) { filters.push([column,'in',values]);return query; },
        order() {return query;},
        limit(n) {return Promise.resolve({data:filter().slice(0,n),error:null});},
        maybeSingle() {return Promise.resolve({data:filter()[0] ?? null,error:null});},
      };
      function filter() {return (records[table]||[]).filter((r)=>filters.every(([c,op,v])=>op==='eq'?r[c]===v:v.includes(r[c])));}
      return query;
    },
  };
  class AccessError extends Error {constructor(code='ACCESS_DENIED', status=403){super(code);this.code=code;this.status=status;}}
  const dependencies = {
    'server-only': {},
    'next/server': {NextResponse:{json(body, options){return {body,status:options.status,headers:options.headers};}}},
    '@supabase/supabase-js':{createClient(_url,key,opts){called.push('createClient');assert.equal(key,'test-publishable-key');assert.ok(opts.global.headers.Authorization.startsWith('Bearer '));return client;}},
    '@/lib/curriculum-developer/server/CurriculumDeveloperApiAuth':{
      CurriculumDeveloperApiAccessError:AccessError,
      async requireCurriculumDeveloperApiAccess(request){
        called.push('requireStaff');
        if(!authorised||request.headers.get('authorization')!=='Bearer staff-token')throw new AccessError();
        return {role:'admin',user_id:qid};
      },
    },
    '@/lib/math/teaching/student-serving/phase4E2B1StaffMethodPreview.server':{
      async previewStaffMathMethod(request,input){called.push('preview');assert.equal(request.headers.get('authorization'),'Bearer staff-token');assert.equal(input.quizId,qid);assert.equal(input.questionId,kid);return preview ?? {status:'selected',previewOnly:true,teachingApproved:false,studentReleased:false,methodId:'MTH-001',familyId:'FAM-01',confidence:'high',candidateMethodCount:2};},
    },
  };
  const transpiled = ts.transpileModule(routeSource, {compilerOptions:{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.CommonJS}});
  assert.equal(transpiled.diagnostics?.length || 0,0);
  const module={exports:{}};
  vm.runInNewContext(transpiled.outputText, {
    module,exports:module.exports, require(n){if(!Object.hasOwn(dependencies,n))throw Error('Unexpected import: '+n);return dependencies[n];},
    Buffer,Request,URL,process:{env:{NEXT_PUBLIC_SUPABASE_URL:'https://example.test',NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:'test-publishable-key'}},
  });
  const createRequest=(path,body,token='staff-token')=>new Request('https://example.test'+path,{
    method:body===undefined?'GET':'POST',
    headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},
    ...(body!==undefined?{body:typeof body==='string'?body:JSON.stringify(body)}:{}),
  });
  return {route:module.exports,called,createRequest};
}

test('all TS/TSX sources transpile without syntax diagnostics',()=>{
  for(const source of [routeSource,panelSource,pageSource]){
    const out=ts.transpileModule(source,{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022},reportDiagnostics:true});
    assert.deepEqual((out.diagnostics||[]).map(x=>x.messageText),[]);
  }
});
test('route requires staff auth before querying database',async()=>{
  const h=harness({authorised:false});const r=await h.route.GET(h.createRequest('?mode=quizzes&level=6'));
  assert.equal(r.status,403);assert.deepEqual(h.called,['requireStaff']);
});
test('POST requires staff auth before preview',async()=>{
  const h=harness({authorised:false});const r=await h.route.POST(h.createRequest('',{quizId:qid,questionId:kid}));
  assert.equal(r.status,403);assert.ok(!h.called.includes('preview'));
});
test('POST refuses invalid IDs before calling preview',async()=>{
  const h=harness();const r=await h.route.POST(h.createRequest('',{quizId:'bad',questionId:kid}));
  assert.equal(r.status,400);assert.ok(!h.called.includes('preview'));
});
test('POST rejects oversized payload without processing',async()=>{
  const h=harness();const r=await h.route.POST(h.createRequest('', 'x'.repeat(2100)));
  assert.equal(r.status,413);assert.ok(!h.called.includes('preview'));
});
test('POST invalid JSON fails closed',async()=>{
  const h=harness();const r=await h.route.POST(h.createRequest('', '{not-json'));
  assert.equal(r.status,400);assert.ok(!h.called.includes('preview'));
});
test('POST selected returns only safe bounded metadata',async()=>{
  const h=harness();const r=await h.route.POST(h.createRequest('',{quizId:qid,questionId:kid}));
  assert.equal(r.status,200);assert.equal(r.body.preview.methodId,'MTH-001');
  assert.ok(!JSON.stringify(r.body).includes(answerSecret));
  assert.equal(r.headers['Cache-Control'],'private, no-store, max-age=0');
  assert.equal(r.headers.Vary,'Authorization');
});
test('POST ambiguous/blocked results remain staff-only and release-disabled',async()=>{
  for(const status of ['blocked','ambiguous']){
    const preview={status,stage:'selector',reasonCodes:['NO_CONFIDENT_SELECTION'],candidateMethodCount:0,previewOnly:true,teachingApproved:false,studentReleased:false};
    const h=harness({preview});const r=await h.route.POST(h.createRequest('',{quizId:qid,questionId:kid}));
    assert.equal(r.body.preview.status,status);assert.equal(r.body.preview.studentReleased,false);
  }
});
test('GET quizzes are restricted by level and do not return answers',async()=>{
  const h=harness();const r=await h.route.GET(h.createRequest('?mode=quizzes&level=6'));
  assert.equal(r.status,200);assert.equal(r.body.quizzes.length,1);
  assert.equal(r.body.quizzes[0].title,'Percentage Final Challenge');
  assert.ok(!JSON.stringify(r.body).includes(answerSecret));
  assert.ok(h.called.some(s=>s.startsWith('select:math_topics:')));
});
test('GET questions return code/type but not prompt or answer_data',async()=>{
  const h=harness();const r=await h.route.GET(h.createRequest('?mode=questions&quizId='+qid));
  assert.equal(r.status,200);assert.equal(r.body.questions.length,1);
  assert.equal(r.body.questions[0].type,'fraction');
  assert.ok(!JSON.stringify(r.body).includes(answerSecret));
  assert.ok(!h.called.some(s=>s.includes('answer_data')));
});
test('GET refuses invalid level and quiz ID',async()=>{
  const h=harness();assert.equal((await h.route.GET(h.createRequest('?mode=quizzes&level=0'))).status,400);
  assert.equal((await h.route.GET(h.createRequest('?mode=questions&quizId=oops'))).status,400);
});
test('GET prevents non-Math quiz from returning question listings',async()=>{
  const h=harness({data:{math_topics:[{id:tid,subject:'science',primary_level:6}]}});
  const r=await h.route.GET(h.createRequest('?mode=questions&quizId='+qid));
  assert.equal(r.status,404);assert.ok(!h.called.includes('from:math_quiz_questions'));
});
test('GET missing quiz does not reveal questions',async()=>{
  const h=harness({data:{math_quizzes:[]}});
  const r=await h.route.GET(h.createRequest('?mode=questions&quizId='+qid));
  assert.equal(r.status,404);
});
test('UI uses authenticated token, response safety gates and status distinctions',()=>{
  assert.match(panelSource,/supabase\.auth\.getSession\(\)/);
  assert.match(panelSource,/Bearer \$\{data\.session\.access_token\}/);
  assert.match(panelSource,/preview\.teachingApproved !== false/);
  assert.match(panelSource,/preview\.studentReleased !== false/);
  assert.match(panelSource,/selected/);assert.match(panelSource,/ambiguous/);assert.match(panelSource,/blocked/);
  assert.ok(!panelSource.includes('dangerouslySetInnerHTML'));
  assert.match(pageSource,/robots:/);
});
test('no writes, service role, student endpoint, or embedded answer fields',()=>{
  assert.ok(!routeSource.includes('SUPABASE_SERVICE_ROLE_KEY'));
  assert.ok(!routeSource.includes(".insert("));assert.ok(!routeSource.includes(".update("));assert.ok(!routeSource.includes(".upsert("));
  assert.ok(!routeSource.match(/\.select\(['"`][^'"`]*answer_data/)); // no SQL query selects answers
  assert.ok(!routeSource.includes(".select('prompt"));
  assert.ok(cssSource.includes('@media'));
});
