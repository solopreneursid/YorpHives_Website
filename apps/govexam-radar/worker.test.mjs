import test from "node:test";
import assert from "node:assert/strict";
import worker from "./worker.js";
const request=(path,method="GET")=>worker.fetch(new Request("https://app.example"+path,{method}));
test("health responds without PII or fake sync",async()=>{const r=await request("/api/health");assert.equal(r.status,200);const x=await r.json();assert.equal(x.status,"ok");assert.equal(x.service,"hqventures-govradar");});
test("catalog is honest and has source allowlist",async()=>{const r=await request("/api/catalog");assert.equal(r.status,200);const d=await r.json();assert.equal(d.verifiedListings.length,0);assert.ok(d.leads.every(x=>d.sources.some(s=>s.id===x.sourceId)));assert.equal(new Set(d.sources.map(s=>s.country)).size,10);assert.ok(d.sources.every(s=>new URL(s.url).protocol==="https:"));});
test("full original six-tab experience and separate simple interface",async()=>{
    const r=await request("/");assert.equal(r.status,200);
    const html=await r.text();
    for(const id of ["view-radar","view-alerts","view-feeds","view-saved","view-community","view-guide"])assert.ok(html.includes('id="'+id+'"'),id);
    assert.match(html,/Research Preview/);
    assert.match(r.headers.get("Content-Security-Policy"),/script-src/);
    const lite=await request("/lite");assert.equal(lite.status,200);
    assert.match(lite.headers.get("Content-Security-Policy"),/script-src 'self'/);
  });
test("assets, manifest, PWA and service worker are served",async()=>{for(const path of ["/app.css","/app.js","/icon.svg","/manifest.webmanifest","/sw.js"]){const r=await request(path);assert.equal(r.status,200,path);assert.ok((await r.text()).length>40,path);}});
test("self-hosted full CSS is served",async()=>{const r=await request("/full.css");assert.equal(r.status,200);assert.match(await r.text(),/\.bg-indigo-600/);});
test("browser enhancements are independently served",async()=>{const r=await request("/enhance.js");assert.equal(r.status,200);const js=await r.text();assert.match(js,/runFeedSync/);assert.match(js,/handleCommunityLogin/);});
test("public OpenAPI contract is machine readable",async()=>{const r=await request("/openapi.json");assert.equal(r.status,200);const spec=await r.json();assert.equal(spec.openapi,"3.1.0");assert.ok(spec.paths["/api/catalog"]);});
test("unsafe paths and methods are rejected",async()=>{assert.equal((await request("/api/check?id=https://evil.invalid")).status,404);assert.equal((await request("/does-not-exist")).status,404);assert.equal((await request("/api/catalog","POST")).status,405);});

test("source status endpoint does not fake checks when binding is missing",async()=>{const r=await request("/api/source-status");assert.equal(r.status,503);const x=await r.json();assert.equal(x.error,"not_configured");});
