import {test} from 'node:test';
import {strict as assert} from 'node:assert';
import {readFile} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const read=path=>readFile(resolve(root,'dist',path),'utf8');
test('lightweight launcher is accessible from tools, directory and HQventures without new routes',async()=>{
 const [home,directory,tool,script]=await Promise.all([read('index.html'),read('tools/index.html'),read('tools/word-counter/index.html'),read('quick-launcher.mjs')]);
 for(const page of [home,directory,tool])assert.match(page,/src="\/quick-launcher\.mjs"/);
 assert.match(home,/data-open-launcher/);assert.match(directory,/data-open-launcher/);
 assert.match(script,/event\.ctrlKey\|\|event\.metaKey/);
 assert.match(script,/qualifiedProducts\(all\)/);
 assert.match(script,/fetch\('\/catalog\.json'/);
 assert.doesNotMatch(script,/https:\/\/|sendBeacon|XMLHttpRequest/);
});
