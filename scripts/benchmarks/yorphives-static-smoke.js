// YorpHives authorized low-impact static review smoke (no API calls, no writes).
import http from 'k6/http';
import {check,sleep} from 'k6';
const ORIGIN='https://073b7c05.yorphives-v1-review.pages.dev';
const paths=['/','/tools/','/tools/word-counter/','/sitemap.xml'];
export const options={
  stages:[{duration:'15s',target:5},{duration:'25s',target:10},{duration:'10s',target:0}],
  gracefulStop:'5s',
  thresholds:{http_req_failed:['rate<0.01'],http_req_duration:['p(95)<2000'],checks:['rate>0.99']},
  tags:{project:'yorphives',environment:'review',test:'static-smoke'}
};
export default function(){
  const path=paths[(__ITER+__VU)%paths.length];
  const response=http.get(ORIGIN+path,{timeout:'10s',headers:{'User-Agent':'YorpHives-authorized-readonly-smoke/1.0'},tags:{path}});
  check(response,{'HTTP 200':r=>r.status===200});
  sleep(2);
}
