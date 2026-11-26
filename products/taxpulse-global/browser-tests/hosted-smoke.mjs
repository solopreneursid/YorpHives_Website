import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {readFileSync} from 'node:fs';
const target=JSON.parse(readFileSync(new URL('../data/hosted-preview-check.json',import.meta.url),'utf8'));
const origin='https://hqventures-taxpulse-integrated-preview.solopreneursid-proy.workers.dev';
assert.match(target.revision,/^[a-f0-9]{64}$/);
async function get(path){const r=await fetch(origin+path,{signal:AbortSignal.timeout(20000),redirect:'error',headers:{'cache-control':'no-cache'}});assert.equal(r.status,200,path);assert.match(r.headers.get('x-robots-tag')||'',/noindex/);return r;}
const health=await (await get('/health')).json();assert.equal(health.previewRevision,target.revision);assert.equal(health.taxRulesVerified,false);assert.equal(health.monetization,'disabled');
const status=await (await get('/v1/regulatory/status')).json();assert.equal(status.monitoring.configuredSources,target.sourceCount);assert.equal(status.monitoring.taxRulesVerified,false);
const runtime=await (await get('/v1/regulatory/runtime')).json();assert.equal(runtime.state,target.runtimeState);
const browser=await chromium.launch({headless:true});try{
 for(const width of [320,390,1440]){const page=await browser.newPage({viewport:{width,height:900}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(origin+'/tax-rules',{waitUntil:'domcontentloaded',timeout:30000});await page.locator('.regulatory-panel').waitFor({state:'visible',timeout:20000});assert.equal(await page.locator('.regulatory-source').count(),target.sourceCount);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 await page.goto(origin+'/tools/regional-tax',{waitUntil:'domcontentloaded',timeout:30000});await page.locator('#regional-tax').waitFor({state:'visible',timeout:20000});assert.equal(await page.locator('#tools').isVisible(),false);assert.deepEqual(errors,[]);await page.close();}
}finally{await browser.close();}
console.log('Hosted preview revision, regulatory status, direct routes and three viewport checks passed: '+target.revision);
