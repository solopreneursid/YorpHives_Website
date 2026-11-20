// Bounded 100 HTTP/s endurance check on isolated YorpHives review ONLY.
// No backend APIs, no form submissions, no production host, no user data.
import http from 'k6/http';
import {check} from 'k6';
const ORIGIN='https://073b7c05.yorphives-v1-review.pages.dev';
const PATHS=['/','/tools/','/tools/word-counter/','/sitemap.xml'];
export const options={
 scenarios:{static_reads:{
   executor:'constant-arrival-rate',rate:100,timeUnit:'1s',duration:'90s',
   preAllocatedVUs:100,maxVUs:200,gracefulStop:'5s'
 }},
 maxRedirects:0,
 discardResponseBodies:true,
 userAgent:'YorpHives-Authorized-Review-Static-Endurance/1.0',
 thresholds:{
   http_req_failed:[{threshold:'rate<0.01',abortOnFail:true,delayAbortEval:'20s'}],
   http_req_duration:[{threshold:'p(95)<1500',abortOnFail:true,delayAbortEval:'20s'}],
   checks:[{threshold:'rate>0.99',abortOnFail:true,delayAbortEval:'20s'}],
   dropped_iterations:[{threshold:'count<1',abortOnFail:true,delayAbortEval:'20s'}]
 },
 tags:{target:'yorphives-review',type:'static-get',profile:'100rps-90seconds'}
};
export default function(){
 const path=PATHS[(__VU+__ITER)%PATHS.length];
 const response=http.get(ORIGIN+path,{timeout:'9s',tags:{static_path:path}});
 check(response,{'HTTP 200':r=>r.status===200});
}
