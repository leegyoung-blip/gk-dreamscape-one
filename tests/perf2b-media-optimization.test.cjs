/** PERF-2B: first-render media on the four landing pages stays optimized, resolvable and deferred. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

const PAGES = ['app/page.tsx', 'app/inventor/page.tsx', 'app/learning-missions/page.tsx', 'app/milo-world/page.tsx'];
const MEDIA_RE = /["'`(](\/[^"'`()\s]+?\.(?:png|jpe?g|webp|avif|gif|svg|mp4|webm))["'`)]/gi;
const RASTER_BUDGET_BYTES = 600 * 1024;

const refsIn = (file) => [...new Set([...read(file).matchAll(MEDIA_RE)].map((m) => m[1]))];
const publicPath = (ref) => path.join(root, 'public', decodeURI(ref));

const OPTIMIZED = {
 '/home/nova-world-cover.webp': '/home/nova-world-cover.png',
 '/home/milo-world-cover.webp': '/home/milo-world-cover.png',
 '/home/preview-learning-missions-w1600.webp': '/home/preview-learning-missions.png',
 '/home/preview-rover-w1600.webp': '/home/preview-rover.png',
 '/home/preview-nova-home-w1600.webp': '/home/preview-nova-home.png',
 '/home/trust-ai-development-w384.webp': '/home/trust-ai-development.png',
 '/home/trust-teacher-review-w384.webp': '/home/trust-teacher-review.png',
 '/home/trust-continuous-improvement-w384.webp': '/home/trust-continuous-improvement.png',
 '/home/dreamscape-logo-w192.webp': '/home/dreamscape-logo.png',
 '/home/nova-plus-my-learning-w1600.webp': '/home/nova-plus-my-learning.png',
 '/home/nova-plus-strengths-gaps.webp': '/home/nova-plus-strengths-gaps.png',
 '/home/nova-plus-mastery-map-w1600.webp': '/home/nova-plus-mastery-map.png',
 '/home/nova-plus-report.webp': '/home/nova-plus-report.png',
 '/nova/nova-character-h640.webp': '/nova/nova-character.png',
 '/milo-world/milo-character-h640.webp': '/milo-world/milo-character.png',
 '/nova/nova-world-bg.webp': '/nova/nova-world-bg.png',
 '/milo-world/milo-world-bg.webp': '/milo-world/milo-world-bg.png',
 '/nova/learning-missions/learning-missions-bg.webp': '/nova/learning-missions/learning-missions-bg.png',
 '/milo-world/membership/milos-club-cover.webp': '/milo-world/membership/milos-club-cover.png',
};

/* Minimal WebP header parser (VP8 / VP8L / VP8X) for dimension checks without dependencies. */
function webpSize(file) {
 const b = fs.readFileSync(file);
 assert.equal(b.toString('ascii', 0, 4), 'RIFF', `${file} is not RIFF`);
 assert.equal(b.toString('ascii', 8, 12), 'WEBP', `${file} is not WEBP`);
 const chunk = b.toString('ascii', 12, 16);
 if (chunk === 'VP8X') return {w: 1 + b.readUIntLE(24, 3), h: 1 + b.readUIntLE(27, 3)};
 if (chunk === 'VP8L') { const n = b.readUInt32LE(21); return {w: 1 + (n & 0x3fff), h: 1 + ((n >> 14) & 0x3fff)}; }
 if (chunk === 'VP8 ') return {w: b.readUInt16LE(26) & 0x3fff, h: b.readUInt16LE(28) & 0x3fff};
 throw new Error(`${file}: unknown WebP chunk ${chunk}`);
}

test('every media reference on the four pages resolves to an existing public file', () => {
 for (const page of PAGES) {
  const refs = refsIn(page);
  assert.ok(refs.length > 0, `${page} has media references`);
  for (const ref of refs) assert.ok(fs.existsSync(publicPath(ref)), `${page} references missing ${ref}`);
 }
});
test('no raster image referenced on the four pages exceeds the 600 KB budget', () => {
 for (const page of PAGES) {
  for (const ref of refsIn(page).filter((r) => /\.(png|jpe?g|webp|avif|gif)$/i.test(r))) {
   const size = fs.statSync(publicPath(ref)).size;
   assert.ok(size <= RASTER_BUDGET_BYTES, `${page}: ${ref} is ${(size / 1024).toFixed(0)} KB`);
  }
 }
});
test('optimized WebPs are valid, sized to their labels, and every original is preserved', () => {
 for (const [webp, original] of Object.entries(OPTIMIZED)) {
  assert.ok(fs.existsSync(publicPath(original)), `original kept: ${original}`);
  const {w, h} = webpSize(publicPath(webp));
  const width = webp.match(/-w(\d+)\.webp$/), height = webp.match(/-h(\d+)\.webp$/);
  if (width) assert.ok(w <= Number(width[1]) && w >= Number(width[1]) * 0.99, `${webp} width ${w}`);
  if (height) assert.equal(h, Number(height[1]), `${webp} height`);
  assert.ok(fs.statSync(publicPath(webp)).size < fs.statSync(publicPath(original)).size, `${webp} smaller than original`);
 }
});
test('optimized assets keep at least 2x the largest CSS display size used on these pages', () => {
 assert.ok(webpSize(publicPath('/nova/nova-character-h640.webp')).h >= 2 * 250, 'Nova shown up to 250px tall');
 assert.ok(webpSize(publicPath('/milo-world/milo-character-h640.webp')).h >= 2 * 245, 'Milo shown up to 245px tall');
 assert.ok(webpSize(publicPath('/home/dreamscape-logo-w192.webp')).w >= 2 * 54, 'logo shown up to 54px');
 assert.ok(webpSize(publicPath('/home/trust-ai-development-w384.webp')).w >= 2 * 132, 'trust images shown at 132px');
});
test('no page renders a raw autoplay video; every background video goes through DeferredVideo', () => {
 for (const page of PAGES) {
  const src = read(page);
  assert.ok(!/<video\b/.test(src), `${page} has a raw <video>`);
  assert.ok(!/preload="auto"/.test(src), `${page} uses preload="auto"`);
  assert.match(src, /<DeferredVideo\b[\s\S]*?src="[^"]+\.mp4"|<DeferredVideo\b[\s\S]*?src=\{world\.videoSrc\}/, `${page} uses DeferredVideo`);
  assert.match(src, /import DeferredVideo from "@\/components\/media\/DeferredVideo";/);
 }
});
test('every deferred video has a lightweight poster, preloaded at high priority', () => {
 assert.match(read('app/page.tsx'), /poster=\{world\.imageSrc\}/);
 assert.match(read('app/page.tsx'), /preload\(world\.imageSrc, \{ as: "image", fetchPriority: "high" \}\)/);
 for (const [page, constant, file] of [
  ['app/inventor/page.tsx', 'NOVA_WORLD_POSTER', '/nova/nova-world-bg.webp'],
  ['app/learning-missions/page.tsx', 'LEARNING_MISSIONS_POSTER', '/nova/learning-missions/learning-missions-bg.webp'],
  ['app/milo-world/page.tsx', 'MILO_WORLD_POSTER', '/milo-world/milo-world-bg.webp'],
 ]) {
  const src = read(page);
  assert.ok(src.includes(`const ${constant} = "${file}";`), `${page} poster constant`);
  assert.ok(src.includes(`poster={${constant}}`), `${page} poster used`);
  assert.ok(src.includes(`preload(${constant}, { as: "image", fetchPriority: "high" });`), `${page} poster preloaded`);
 }
});
test('DeferredVideo attaches its source only when visible, after load, and without reduced motion', () => {
 const src = read('components/media/DeferredVideo.tsx');
 assert.match(src, /^"use client";/);
 assert.match(src, /src=\{active \? src : undefined\}/);
 assert.match(src, /autoPlay=\{active\}/);
 assert.match(src, /preload="none"/);
 assert.match(src, /muted[\s\S]*loop[\s\S]*playsInline/);
 assert.match(src, /prefers-reduced-motion: reduce/);
 assert.match(src, /new IntersectionObserver/);
 assert.match(src, /document\.readyState === "complete"/);
 assert.match(src, /addEventListener\("load", handleLoad, \{ once: true \}\)/);
 assert.match(src, /video\.pause\(\)/);
 assert.match(src, /observer\.disconnect\(\)[\s\S]*removeEventListener\("load"[\s\S]*removeEventListener\("change"/);
});
test('below-the-fold homepage images are lazy and the header logo is not', () => {
 const src = read('app/page.tsx');
 const imgTags = [...src.matchAll(/<img\b[\s\S]*?\/>/g)].map((m) => m[0]);
 const lazy = imgTags.filter((t) => /loading="lazy"/.test(t)).length;
 assert.ok(lazy >= 7, `expected at least 7 lazy images, found ${lazy}`);
 const header = imgTags.find((t) => t.includes('dreamscape-logo-w192.webp') && t.includes('Dreamscape One logo'));
 assert.ok(header && !/loading="lazy"/.test(header), 'header logo stays eager');
});
