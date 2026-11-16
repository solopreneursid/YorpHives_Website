import assert from "node:assert/strict";
import {randomBytes} from "node:crypto";
// Smoke against the isolated GovRadar full-parity Worker. Uses an unlisted QA-only discussion room.
const base=process.env.GOVRADAR_TEST_URL||"https://hqventures-govexam-parity-preview.solopreneursid-proy.workers.dev";
const suffix=randomBytes(5).toString("hex");
const handle="qa_"+suffix;
const token=randomBytes(32).toString("hex");
const examId="qa-room-"+suffix;
async function call(path,method="GET",body,authenticated=true){
 const headers={Accept:"application/json"};
 if(method==="POST")headers["Content-Type"]="application/json";
 if(authenticated)headers["X-GovRadar-Token"]=token;
 const response=await fetch(base+path,{method,headers,body:body?JSON.stringify(body):undefined});
 let result;try{result=await response.json();}catch{throw Error("Non-JSON response "+response.status+" for "+path);}
 assert.ok(response.ok,path+" status "+response.status+": "+JSON.stringify(result));
 return result;
}
assert.equal((await call("/api/health")).status,"ok");
const registration=await call("/api/community/register","POST",{handle,token},false);
assert.equal(registration.handle,handle);
const post=await call("/api/community/post","POST",{examId,tag:"#Syllabus & Strategy",content:"Automated API smoke test post in an unlisted QA room."});
assert.ok(post.id);
const reply=await call("/api/community/reply","POST",{postId:post.id,content:"Verified reply creation in QA-only room."});
assert.ok(reply.id);
assert.equal((await call("/api/community/vote","POST",{postId:post.id})).voted,true);
const room=await call("/api/community/posts?examId="+examId);
assert.equal(room.posts.length,1);
assert.equal(room.posts[0].replies.length,1);
assert.equal(room.posts[0].upvotes,1);
assert.equal(room.posts[0].upvotedByMe,true);
console.log("SUCCESS: verified community identity, post, reply, vote, read on D1 backend.");