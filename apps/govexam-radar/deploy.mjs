// Node 22+; reads credentials only from environment, never from source.
import {readFile} from "node:fs/promises";
const account=process.env.CLOUDFLARE_ACCOUNT_ID;
const token=process.env.CLOUDFLARE_API_TOKEN;
const name="hqventures-govexam-radar";
if(!account||!token){console.error("Set CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN in your local environment.");process.exit(1);}
const code=await readFile(new URL("./worker.js",import.meta.url),"utf8");
const form=new FormData();
form.append("metadata",new Blob([JSON.stringify({main_module:"worker.js",compatibility_date:"2026-11-16",observability:{enabled:true,traces:{enabled:true}}})],{type:"application/json"}));
form.append("worker.js",new Blob([code],{type:"application/javascript+module"}),"worker.js");
const response=await fetch("https://api.cloudflare.com/client/v4/accounts/"+account+"/workers/scripts/"+name,{method:"PUT",headers:{Authorization:"Bearer "+token},body:form});
const result=await response.json();
if(!response.ok||!result.success){console.error(JSON.stringify(result.errors||result,null,2));process.exit(1);}
console.log("Deployed "+name+"; check its workers.dev route or custom domain.");
