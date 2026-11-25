import a0 from './index.html.txt';
import a1 from './script-1.js.txt';
import a2 from './script-2.js.txt';
import a3 from './style-1.css.txt';
import a4 from './style-2.css.txt';
import a5 from './application.js.txt';
import a6 from './primitives.js.txt';
import a7 from './country-rules.js.txt';
import {calculate} from './api.mjs';
import {advancedCalculate,supported} from './advanced.mjs';
import {countryCalculate,catalog} from './country.mjs';
import {spec} from './openapi.mjs';
const assets={"/":[a0,"text/html"],"/assets/script-1.js":[a1,"application/javascript"],"/assets/script-2.js":[a2,"application/javascript"],"/assets/style-1.css":[a3,"text/css"],"/assets/style-2.css":[a4,"text/css"],"/assets/application.js":[a5,"application/javascript"],"/assets/primitives.js":[a6,"application/javascript"],"/assets/country-rules.js":[a7,"application/javascript"]};
const headers={'cache-control':'no-store','x-robots-tag':'noindex, nofollow','x-content-type-options':'nosniff','referrer-policy':'no-referrer','content-security-policy':"default-src 'none'; script-src 'self' https://cdn.tailwindcss.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src data: blob:; connect-src 'none'; form-action 'none'; frame-ancestors 'none'; base-uri 'none'; object-src 'none'; worker-src 'none'"};
const json=(x,status=200)=>new Response(JSON.stringify(x),{status,headers:{...headers,'content-type':'application/json'}});
async function read(req){const r=req.body?.getReader();if(!r)throw Error('Missing body');let n=0,parts=[];while(true){const {done,value}=await r.read();if(done)break;n+=value.byteLength;if(n>16384){await r.cancel();throw Error('Too large')}parts.push(value)}return JSON.parse(await new Blob(parts).text())}
export default{async fetch(req){const u=new URL(req.url),p=u.pathname;if(['/v1/calculate','/v1/country/calculate','/v1/advanced/calculate'].includes(p)&&req.method==='POST'){if(req.headers.has('origin')&&req.headers.get('origin')!==u.origin)return json({error:'Origin denied'},403);if(!/^application\/json(?:;|$)/i.test(req.headers.get('content-type')||''))return json({error:'JSON required'},415);try{return json((p==='/v1/advanced/calculate'?advancedCalculate:p==='/v1/country/calculate'?countryCalculate:calculate)(await read(req)))}catch{return json({error:'Invalid or unsupported sample parameters'},400)}}if(!['GET','HEAD'].includes(req.method))return json({error:'Method not allowed'},405);if(p==='/health')return json({status:'ok',release:'integrated-engine-preview',taxRulesVerified:false,api:'sample primitives and country modules'});if(p==='/v1/catalog')return json({...catalog(),advancedModules:supported});if(p==='/openapi.json')return json(spec);if(['/v1/calculate','/v1/country/calculate','/v1/advanced/calculate'].includes(p))return json({error:'POST required'},405);const a=Object.hasOwn(assets,p)?assets[p]:null;if(!a)return json({error:'Not found'},404);return new Response(req.method==='HEAD'?null:a[0],{headers:{...headers,'content-type':a[1]+'; charset=utf-8'}})}};