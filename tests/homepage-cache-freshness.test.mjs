import {test} from 'node:test';
import {strict as assert} from 'node:assert';
import {readFile} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const read=path=>readFile(resolve(root,path),'utf8');

test('homepage and its script cannot regress to outdated Explore qualification copy',async()=>{
  const [html,script]=await Promise.all([read('index.html'),read('app.js')]);
  const sentence='Here is what every product must pass:';
  assert.match(html,/<p id="explore-qualification-note">Here is what every product must pass:<\/p>/);
  assert.ok(script.includes("if (note) note.textContent = '"+sentence+"';"));
  assert.doesNotMatch(html,/No HQ-qualified products have been released yet/);
  assert.doesNotMatch(script,/No HQ-qualified products have been released yet/);
});

test('navigation HTML and app script use explicit browser freshness policies',async()=>{
  const headers=await read('_headers');
  assert.match(headers,/\n\/\n\s+Cache-Control: no-store(?:\n|$)/);
  assert.match(headers,/\n\/index\.html\n\s+Cache-Control: no-store(?:\n|$)/);
  assert.match(headers,/\n\/app\.js\n\s+Cache-Control: no-cache, max-age=0, must-revalidate(?:\n|$)/);
  assert.match(headers,/Content-Security-Policy:/);
  assert.match(headers,/X-Content-Type-Options: nosniff/);
});

test('production-built website keeps the corrected copy and freshness directives',async()=>{
  const [html,script,headers]=await Promise.all([read('dist/index.html'),read('dist/app.js'),read('dist/_headers')]);
  assert.match(html,/<p id="explore-qualification-note">Here is what every product must pass:<\/p>/);
  assert.doesNotMatch(html,/No HQ-qualified products have been released yet/);
  assert.doesNotMatch(script,/No HQ-qualified products have been released yet/);
  assert.match(headers,/\n\/\n\s+Cache-Control: no-store/);
});
