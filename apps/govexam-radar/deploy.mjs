// Node.js 22+ standalone deployment tool. Credentials only from environment.
import {readFile} from "node:fs/promises";
const account=process.env.CLOUDFLARE_ACCOUNT_ID;
const token=process.env.CLOUDFLARE_API_TOKEN;
const name=process.env.GOVRADAR_WORKER_NAME||"hqventures-govexam-parity-preview";
const database="b1f499a6-283b-47e8-8cd7-ef2b5f7245bc";
if(!account||!token){console.error("Set CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN in your environment.");process.exit(1);}
const form=new FormData();
form.append("metadata",new Blob([JSON.stringify({
 main_module:"worker.js",compatibility_date:"2026-11-16",
 bindings:[{type:"d1",name:"DB",database_id:database}],
 observability:{enabled:true,traces:{enabled:true}}
})],{type:"application/json"}));
for(const name of ["worker.js","full-ui.mjs","full-css.mjs","enhance.mjs","community-api.mjs","source-monitor.mjs"]){
 const code=await readFile(new URL("./"+name,import.meta.url),"utf8");
 form.append(name,new Blob([code],{type:"application/javascript+module"}),name);
}
const response=await fetch("https://api.cloudflare.com/client/v4/accounts/"+account+"/workers/scripts/"+name,{method:"PUT",headers:{Authorization:"Bearer "+token},body:form});
const result=await response.json();
if(!response.ok||!result.success){console.error(JSON.stringify(result.errors||result,null,2));process.exit(1);}
console.log("Deployed "+name+" with first-party modules and isolated D1 binding.");
