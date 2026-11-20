// Authorized, rate-limited *static* YorpHives review-site load profile.
// Each VU simulates one mostly-idle browsing session. This does NOT measure
// concurrent in-flight HTTP requests or maximum real-user capacity.
import http from 'k6/http';
import {check,sleep} from 'k6';
const ORIGIN='https://073b7c05.yorphives-v1-review.pages.dev';
const PATHS=Object.freeze(['/','/tools/','/tools/word-counter/','/sitemap.xml']);
const ALLOWED=Object.freeze([50,100,250]);
const users=Number(__ENV.USERS||0);
if(!ALLOWED.includes(users))throw new Error('Only bounded review tests of 50, 100 and 250 VUs are permitted');
const seconds=users===250?45:35;
export const options={
 scenarios:{read_only_sessions:{executor:'constant-vus',vus:users,duration:seconds+'s',gracefulStop:'5s'}},
 rps:35, // upper bound on request generation, even if VU scheduling changes
 userAgent:'YorpHives-Authorized-ReadOnly-Review-Load-Test/2',
 maxRedirects:0,
 discardResponseBodies:true,
 thresholds:{
  http_req_failed:[{threshold:'rate<0.01',abortOnFail:true,delayAbortEval:'15s'}],
  http_req_duration:[{threshold:'p(95)<1500',abortOnFail:true,delayAbortEval:'15s'}],
  checks:[{threshold:'rate>0.99',abortOnFail:true,delayAbortEval:'15s'}]
 },
 tags:{project:'yorphives',target:'isolated-review',phase:'vus-'+users}
};
export default function(){
 // Spread launch times; avoid a synchronized request storm.
 if(__ITER===0)sleep(((__VU*7)%13)+Math.random());
 const path=PATHS[(__VU+__ITER)%PATHS.length];
 const response=http.get(ORIGIN+path,{timeout:'9s',tags:{static_path:path}});
 check(response,{'HTTP 200 static page':r=>r.status===200});
 // Realistic user dwell time; this is NOT 250 parallel network requests.
 sleep(11+Math.random()*3);
}
