import {test} from 'node:test';
import {strict as assert} from 'node:assert';
import {assessWorkflow,assessHeartbeat} from './monitor-health.mjs';
test('fresh successful main runs are required; PR and future or failed runs do not hide problems',()=>{
 const now=Date.now(),run={status:'completed',head_branch:'main',event:'schedule',conclusion:'success',updated_at:new Date(now-3600000).toISOString()};
 assert.equal(assessWorkflow([run],18,now).healthy,true);
 assert.equal(assessWorkflow([{...run,conclusion:'failure'}],18,now).healthy,false);
 assert.equal(assessWorkflow([{...run,event:'pull_request'}],18,now).healthy,false);
 assert.equal(assessWorkflow([{...run,updated_at:new Date(now-19*3600000).toISOString()}],18,now).healthy,false);
 assert.equal(assessWorkflow([{...run,updated_at:new Date(now+3600000).toISOString()}],18,now).healthy,false);
 const oldScheduled={...run,updated_at:new Date(now-19*3600000).toISOString()};
 const freshPush={...run,event:'push'};
 assert.equal(assessWorkflow([oldScheduled,freshPush],18,now).healthy,false,'A push must not hide a missed schedule');
 assert.equal(assessWorkflow([freshPush],18,now).healthy,true,'New workflows have one initial grace window');
 assert.equal(assessWorkflow([],30,now).healthy,false);
});
test('heartbeat must be exact positive evidence, without customer data',()=>{
 assert.equal(assessHeartbeat(200,{ok:true}),true);
 for(const [status,payload] of [[503,{ok:false}],[200,{ok:false}],[200,null],[200,{ok:true,name:'unexpected'}]])
  assert.equal(assessHeartbeat(status,payload),false);
});
