import test from "node:test";
import assert from "node:assert/strict";
import {serveIngestionStatus,DFE_SOURCE} from "./official-feed.mjs";
import {MANITOBA} from "./manitoba-feed.mjs";
const recent=Date.now()-45000;
function statusDb(nativeManitoba=false){
 const observedSql=[];
 return {observedSql,
  prepare(sql){
   return {bind(){return this},
    async first(){return{total:238}},
    async all(){
     if(sql.includes("lastSuccessfulSignedAt")){
      observedSql.push(sql);
      return {results:[
       {sourceId:DFE_SOURCE.id,lastSuccessfulScheduledAt:recent,lastSuccessfulSignedAt:null},
       {sourceId:MANITOBA.id,lastSuccessfulScheduledAt:nativeManitoba?recent:null,lastSuccessfulSignedAt:recent}
      ]};
     }
     return {results:[]};
    }
   };
  }
 };
}
test("an authenticated one-time transfer is not mistaken for native scheduled operation",async()=>{
 const db=statusDb(false),res=await serveIngestionStatus(db),json=await res.json();
 assert.equal(res.status,200);
 assert.equal(json.automation.signedCollectorVerified,true);
 assert.equal(json.automation.observedForAllSources,false);
 assert.equal(json.automation.healthy,false);
 const can=json.automation.sources.find(x=>x.sourceId===MANITOBA.id);
 assert.equal(can.signedCollectorSuccessObserved,true);
 assert.equal(can.scheduledSuccessObserved,false);
 assert.ok(db.observedSql[0].includes('details LIKE'));
 assert.ok(db.observedSql[0].includes('signed_portable_collector'));
});
test("native Cron is verified only when each official source has its own recent Cron proof",async()=>{
 const r=await serveIngestionStatus(statusDb(true)),json=await r.json();
 assert.equal(json.automation.observedForAllSources,true);
 assert.equal(json.automation.healthy,true);
});
