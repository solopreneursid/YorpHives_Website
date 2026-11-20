// Authorized, bounded traffic-throughput test for YorpHives static review pages.
// Static GET only; no APIs, no submissions, no asset poisoning or production access.
import http from 'k6/http';
import {check} from 'k6';
const ORIGIN='https://073b7c05.yorphives-v1-review.pages.dev';
const PATHS=Object.freeze(['/','/tools/','/tools/word-counter/','/sitemap.xml']);
const ALLOWED=new Set([25,40,60]);
const rate=Number(__ENV.RATE);
if(!ALLOWED.has(rate))throw new Error('Only approved throughput stages of 25, 40 or 60 RPS are allowed');
export const options={
 scenarios:{
  static_reads:{
   executor:'constant-arrival-rate',
   rate,
   timeUnit:'1s',
   duration:'35s',
   preAllocatedVUs:Math.max(20,rate),
   maxVUs:Math.max(40,rate*2),
   gracefulStop:'4s'
  }
 },
 maxRedirects:0,
 discardResponseBodies:true,
 userAgent:'YorpHives-Authorized-Review-RPS-Test/1.0',
 thresholds:{
  http_req_failed:[{threshold:'rate<0.01',abortOnFail:true,delayAbortEval:'15s'}],
  http_req_duration:[{threshold:'p(95)<1500',abortOnFail:true,delayAbortEval:'15s'}],
  checks:[{threshold:'rate>0.99',abortOnFail:true,delayAbortEval:'15s'}],
  dropped_iterations:[{threshold:'count<1',abortOnFail:true,delayAbortEval:'15s'}]
 },
 tags:{project:'yorphives',environment:'review',profile:'static-get-rps-'+rate}
};
export default function(){
 const path=PATHS[(__VU+__ITER)%PATHS.length];
 const res=http.get(ORIGIN+path,{timeout:'9s',tags:{route:path}});
 check(res,{'HTTP 200':r=>r.status===200});
}
