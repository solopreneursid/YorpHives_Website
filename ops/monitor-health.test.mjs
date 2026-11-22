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

test('successful recovery dispatch restores coverage while preserving cron-delay evidence',()=>{
 const now=Date.now(),hours=n=>new Date(now-n*3600000).toISOString();
 const scheduled={status:'completed',head_branch:'main',event:'schedule',conclusion:'success',updated_at:hours(20)};
 const recovered={...scheduled,event:'workflow_dispatch',updated_at:hours(1)};
 const result=assessWorkflow([scheduled,recovered],18,now);
 assert.equal(result.healthy,true);
 assert.equal(result.scheduleHealthy,false);
 assert.equal(result.degraded,true);
 assert.equal(result.lastFallback.event,'workflow_dispatch');
 assert.equal(assessWorkflow([scheduled,{...recovered,conclusion:'failure'}],18,now).healthy,false);
 assert.equal(assessWorkflow([scheduled,{...recovered,updated_at:hours(19)}],18,now).healthy,false);
});
