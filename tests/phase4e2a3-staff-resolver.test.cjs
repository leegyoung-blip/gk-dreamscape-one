'use strict';
const test=require('node:test');const assert=require('node:assert/strict');
const fs=require('node:fs');const path=require('node:path');const Module=require('node:module');const ts=require('typescript');
const SRC=path.resolve(__dirname,'../lib/math/teaching/student-serving/phase4E2A3StaffSourceResolver.server.ts');
const ADAPTER=path.resolve(__dirname,'../lib/math/teaching/student-serving/phase4E2A2TrustedSource.server.ts');
const source=fs.readFileSync(SRC,'utf8');
assert.match(source,/import 'server-only';/);
assert.doesNotMatch(source,/process\.env\.(?:SUPABASE_SERVICE_ROLE_KEY|NEXT_PUBLIC_SUPABASE_SECRET)/i);
assert.doesNotMatch(source,/NextResponse|export async function (GET|POST)|\.insert\(|\.update\(|\.delete\(/);
const uuid1='d2f1bb2e-a39c-425e-85c1-8fe6748d14a8';
const uuid2='f2ac70a8-8fa1-424a-b7c7-0ed38d0f148f';
const topicid='375f6c86-8a2e-44d7-acd7-3554a9a751d5';
const userid='2c66bea0-41f6-4afd-b7f2-37be0432f690';
const mkRows=()=>({
 math_quizzes:{id:uuid1,topic_id:topicid,status:'reviewing',is_published:false,student_visibility:'reviewing',version:2},
 math_topics:{id:topicid,subject:'math',primary_level:6},
 math_quiz_questions:{quiz_id:uuid1,question_id:uuid2,question_order:1},
 math_questions:{id:uuid2,subject:'math',primary_level:6,topic_id:topicid,code:'M-P6',
  question_type:'fraction',instruction:'',prompt:'What fraction?',
  content:{options:[]},answer_data:{display_answer:'3/5'},skill:'fractions',skill_tags:[],difficulty:2,
  status:'published',version:4,review_notes:'INTERNAL_SECRET'},
});
function compile(file,inject){
 const js=ts.transpileModule(fs.readFileSync(file,'utf8'),{fileName:file,compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 const compiled=new Module(file,module);compiled.filename=file;compiled.paths=Module._nodeModulePaths(path.dirname(file));
 compiled.require=(id)=>Object.prototype.hasOwnProperty.call(inject,id)?inject[id]:require(id);
 compiled._compile(js,file);return compiled.exports;
}
const adapter=compile(ADAPTER,{'server-only':{}});
function fixture(custom={}) {
 const rows=mkRows();const calls=[];
 const state={rows,calls,...custom};
 const client={
  auth:{async getUser(){calls.push(['auth.getUser']);return state.badUser?{data:{user:{id:uuid2}},error:null}:{data:{user:{id:userid}},error:null}}},
  from(table){
   calls.push(['from',table]);let fields=[];
   const chain={select(columns){calls.push(['select',table,columns]);return chain;},
    eq(key,value){fields.push([key,value]);return chain;},
    async maybeSingle(){
     calls.push(['maybeSingle',table,fields]);
     const item=rows[table];
     if(state.failTable===table)return {data:null,error:{message:'denied'}};
     if(item==null)return {data:null,error:null};
     if(fields.some(([key,value])=>item[key]!==value))return {data:null,error:null};
     return {data:item,error:null};
    }};return chain;
  }
 };
 const supabase={'createClient':(url,key,opts)=>{
  calls.push(['createClient',url,key,opts]);return client;
 }};
 const auth={'requireCurriculumDeveloperApiAccess':async()=>{
  calls.push(['requireStaff']);
  if(state.rejectRole) throw Error('Forbidden');
  return {user_id: userid, role:state.role||'curriculum_lead'};
 }};
 const resolver=compile(SRC,{
   'server-only':{},'@supabase/supabase-js':supabase,
   '@/lib/curriculum-developer/server/CurriculumDeveloperApiAuth':auth,
   './phase4E2A2TrustedSource.server':adapter,
 });
 const request={headers:{get:(key)=>key==='authorization'? (Object.prototype.hasOwnProperty.call(state,'token')?state.token:'Bearer user.jwt.token'):null}};
 return {run:(ids={quizId:uuid1,questionId:uuid2})=>resolver.resolveStaffMathTeachingSource(request,ids),rows,calls};
}
const prevEnv={
 NEXT_PUBLIC_SUPABASE_URL:process.env.NEXT_PUBLIC_SUPABASE_URL,
 NEXT_PUBLIC_SUPABASE_ANON_KEY:process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
};
process.env.NEXT_PUBLIC_SUPABASE_URL='https://test.supabase.co';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY='public-anon-test-only';
process.on('exit',()=>{for(const [k,v] of Object.entries(prevEnv)){if(v===undefined)delete process.env[k];else process.env[k]=v;}});

test('staff-only resolver returns internal source for verified linked question',async()=>{
 const s=fixture();const result=await s.run();assert.equal(result.status,'ready');
 assert.equal(result.sourceIdentity.questionVersion,4);
 assert.equal(result.source.question.answer_data.display_answer,'3/5');
 assert.equal(result.staffReview.studentReleased,false);
 assert.equal(result.staffReview.quizPublished,false);
 assert.ok(!('review_notes' in result.source.question));
 assert.equal(s.calls[0][0],'requireStaff');
 assert.equal(s.calls.filter(x=>x[0]==='from').length,4);
});
test('invalid IDs are rejected before authentication',async()=>{
 const s=fixture();assert.deepEqual(await s.run({quizId:'oops',questionId:uuid2}),{status:'blocked',reason:'INVALID_QUERY'});
 assert.equal(s.calls.length,0);
});
test('missing Authorization token is blocked',async()=>{
 const s=fixture({token:null}); const out=await s.run();
 assert.equal(out.status,'blocked');assert.equal(s.calls.filter(x=>x[0]==='from').length,0);
});
test('role rejected before DB reads',async()=>{
 const s=fixture({rejectRole:true});assert.equal((await s.run()).status,'blocked');
 assert.equal(s.calls.filter(x=>x[0]==='from').length,0);
});
test('non staff role is blocked',async()=>{
 const s=fixture({role:'teacher'});assert.equal((await s.run()).status,'blocked');
 assert.equal(s.calls.filter(x=>x[0]==='from').length,0);
});
test('principal mismatch is blocked before tables',async()=>{
 const s=fixture({badUser:true});assert.equal((await s.run()).status,'blocked');
 assert.equal(s.calls.filter(x=>x[0]==='from').length,0);
});
test('queries are made with user bearer token and PUBLIC key',async()=>{
 const s=fixture();await s.run();let c=s.calls.find(x=>x[0]==='createClient');
 assert.equal(c[2],'public-anon-test-only');assert.equal(c[3].global.headers.Authorization,'Bearer user.jwt.token');
 assert.equal(c[3].auth.persistSession,false);
});
test('failed RLS/table read blocks without exposing rows',async()=>{
 const s=fixture({failTable:'math_questions'});assert.deepEqual(await s.run(),{status:'blocked',reason:'NOT_FOUND_OR_INCONSISTENT'});
});
test('quiz/question link mismatch blocks',async()=>{
 const s=fixture();s.rows.math_quiz_questions.question_id=uuid1;
 assert.equal((await s.run()).status,'blocked');
});
test('wrong subject topic blocks',async()=>{
 const s=fixture();s.rows.math_topics.subject='science';assert.equal((await s.run()).status,'blocked');
});
test('wrong level or question topic blocks',async()=>{
 const a=fixture();a.rows.math_questions.primary_level=5;assert.equal((await a.run()).status,'blocked');
 const b=fixture();b.rows.math_questions.topic_id=uuid1;assert.equal((await b.run()).status,'blocked');
});
test('missing authoritative answer blocks',async()=>{
 const s=fixture();s.rows.math_questions.answer_data={};assert.deepEqual(await s.run(),{status:'blocked',reason:'SOURCE_NOT_READY'});
});
test('does not create any browser API or modify DB in source',()=>{
 assert.match(source,/staffReview/);assert.match(source,/studentReleased: false/);
 assert.doesNotMatch(source,/\.rpc\(|\.upsert\(|\.insert\(|\.update\(|\.delete\(/);
});
