import assert from "node:assert/strict";
import {randomBytes} from "node:crypto";
// End-to-end test against isolated Cloudflare preview; creates and removes QA-only accounts.
const base=process.env.GOVRADAR_TEST_URL||"https://hqventures-govexam-parity-preview.solopreneursid-proy.workers.dev";
const suffix=randomBytes(5).toString("hex");
const examId="qa-room-"+suffix;
const users=[
  {handle:"qa_"+suffix,token:randomBytes(32).toString("hex")},
  {handle:"review_"+suffix,token:randomBytes(32).toString("hex")}
];
async function call(path,method="GET",body,user=users[0],expectStatus){
  const headers={Accept:"application/json"};
  if(method==="POST")headers["Content-Type"]="application/json";
  if(user)headers["X-GovRadar-Token"]=user.token;
  const response=await fetch(base+path,{method,headers,body:body?JSON.stringify(body):undefined});
  let result;try{result=await response.json();}catch{throw Error("Non-JSON response "+response.status+" for "+path);}
  if(expectStatus!==undefined)assert.equal(response.status,expectStatus,path+": "+JSON.stringify(result));
  else assert.ok(response.ok,path+" status "+response.status+": "+JSON.stringify(result));
  return result;
}
const {status}=await call("/api/health");assert.equal(status,"ok");
try{
  for(const user of users){
    const reg=await call("/api/community/register","POST",{handle:user.handle,token:user.token},null,201);
    assert.equal(reg.handle,user.handle);
  }
  const post=await call("/api/community/post","POST",{examId,tag:"#Syllabus & Strategy",content:"Automated API check in an unlisted QA room."},users[0],201);
  const reply=await call("/api/community/reply","POST",{postId:post.id,content:"Temporary QA reply checking D1 persistence."},users[1],201);
  assert.ok(reply.id);
  assert.equal((await call("/api/community/vote","POST",{postId:post.id},users[1])).voted,true);
  const room=await call("/api/community/posts?examId="+examId,"GET",undefined,users[1]);
  assert.equal(room.posts.length,1);assert.equal(room.posts[0].replies.length,1);
  assert.equal(room.posts[0].upvotes,1);assert.equal(room.posts[0].upvotedByMe,true);
  const report=await call("/api/community/report","POST",{targetType:"post",targetId:post.id,reason:"other"},users[1]);
  assert.equal(report.status,"submitted");
  const me=await call("/api/community/export","GET",undefined,users[0]);
  assert.equal(me.handle,users[0].handle);assert.equal(me.posts.length,1);
  await call("/api/community/delete-post","POST",{postId:post.id},users[0]);
  assert.equal((await call("/api/community/posts?examId="+examId)).posts.length,0);
  console.log("SUCCESS: verified community register, post, reply, vote, report, export, and owner deletion.");
}finally{
  for(const user of users) {
    try{await call("/api/community/delete-account","POST",{confirm:"DELETE"},user);}
    catch(e){console.error("QA account cleanup failed for",user.handle,String(e));process.exitCode=1;}
  }
}
