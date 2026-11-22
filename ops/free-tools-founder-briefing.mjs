// Read-only evidence collection, with GitHub issue-only notifications.
// Never modifies a website, AdSense, production config, or a repository file.
import {execFileSync} from 'node:child_process';
import {assessWorkflow,assessHeartbeat} from './monitor-health.mjs';
const repo=process.env.GITHUB_REPOSITORY;
if(repo!=='solopreneursid/YorpHives_Website')throw Error('Unexpected GitHub repository');
if(!process.env.GH_TOKEN)throw Error('GitHub Actions issue token unavailable');
const cmd=(args,opts={})=>execFileSync('gh',args,{encoding:'utf8',timeout:30000,maxBuffer:6e6,...opts}).trim();
const api=(path)=>JSON.parse(cmd(['api','--method','GET',path]));
const now=Date.now(),hour=3600000;
const titleIncident='YorpHives Free Tools watchdog failure',titleStall='YorpHives Free Tools monitoring stalled';
const titleDigest='YorpHives Free Tools weekly briefing';
const recent=api('/repos/'+repo+'/actions/workflows/free-tools-long-run-watchdog.yml/runs?per_page=20');
const assessment=assessWorkflow(recent.workflow_runs,18,now);
const {last,ageHours}=assessment;
const validLast=assessment.healthy;
const open=api('/repos/'+repo+'/issues?state=open&per_page=100').filter(x=>!x.pull_request);
const named=title=>open.find(x=>x.title===title);
const edit=(n,body)=>cmd(['issue','edit',String(n),'--repo',repo,'--body',body]);
const create=(title,body)=>cmd(['issue','create','--repo',repo,'--title',title,'--body',body]);
const close=(n,note)=>cmd(['issue','close',String(n),'--repo',repo,'--comment',note]);
const safe=s=>String(s||'').replace(/[\r\n]/g,' ').slice(0,240);
const link=last?.html_url||'https://github.com/'+repo+'/actions/workflows/free-tools-long-run-watchdog.yml';
const age=Number.isFinite(ageHours)?ageHours.toFixed(1)+' hours':'unknown';
if(process.argv.includes('--supervise')){
 async function workflowCheck(title,file,maxHours,known){
  const report=known||assessWorkflow(api('/repos/'+repo+'/actions/workflows/'+file+'/runs?per_page=20').workflow_runs,maxHours,now);
  // GitHub cron events can be delayed or dropped. Restore coverage with a
  // bounded workflow_dispatch when the scheduled completion is stale.
  // This does not conceal missed schedules from the founder alert.
  if(!report.scheduleHealthy && ['free-tools-long-run-watchdog.yml','free-tools-functional-security.yml'].includes(file)){
   try{
    const recent=api('/repos/'+repo+'/actions/workflows/'+file+'/runs?per_page=30').workflow_runs||[];
    const latestDispatch=recent.filter(r=>r.head_branch==='main'&&r.event==='workflow_dispatch'&&
      Number.isFinite(Date.parse(r.created_at))).sort((a,b)=>Date.parse(b.created_at)-Date.parse(a.created_at))[0];
    const recentlyDispatched=latestDispatch&&now-Date.parse(latestDispatch.created_at)<4*hour;
    if(!recentlyDispatched){
     cmd(['api','--method','POST','/repos/'+repo+'/actions/workflows/'+file+'/dispatches','-f','ref=main']);
     console.log('MONITOR FALLBACK DISPATCHED '+file);
    }else console.log('MONITOR FALLBACK ALREADY REQUESTED '+file);
   }catch(error){console.error('MONITOR FALLBACK UNAVAILABLE '+file+': '+safe(error.message));}
  }
 const cronTitle=file==='free-tools-long-run-watchdog.yml'?
   'YorpHives watchdog cron schedule delayed':'YorpHives functional checks cron schedule delayed';
 const cronIssue=named(cronTitle);
 if(!report.scheduleHealthy && report.degraded){
  const note=['# GitHub scheduled run delayed','',
   '@solopreneursid — a scheduled check was missed, but a recent successful recovery dispatch provides coverage.',
   'This does not prove a website outage.',
   'Source workflow: '+file,
   'Last scheduled completion: '+safe(report.lastScheduled?.updated_at||'not observed'),
   'Last recovery: '+safe(report.lastFallback?.updated_at||'not observed')].join('\n');
  if(!cronIssue)create(cronTitle,note);
 }else if(report.scheduleHealthy&&cronIssue)close(cronIssue.number,'Scheduled monitoring has resumed.');
 const run=report.last,existing=named(title);
  const evidence=run?.html_url||'https://github.com/'+repo+'/actions/workflows/'+file;
  if(!report.healthy){
   const state=run?'Latest completed run: '+safe(run.conclusion)+' at '+safe(run.updated_at)+'.':'No completed main-branch run was found.';
   const scheduled='Latest scheduled completion: '+safe(report.lastScheduled?.updated_at||'not observed')+'.';
   const body=['# Monitoring needs attention','', '@solopreneursid — a required Free Tools check is failed, stale, or unavailable.',
    state,scheduled,'Expected: successful scheduled monitoring within '+maxHours+' hours.','Evidence: '+evidence,'',
    'This does not prove that the tools are broken. Review the workflow and its evidence.',
    'No website, customer data, ad setting, or production configuration was changed.'].join('\n');
   if(!existing)create(title,body);
   else if(!String(existing.body||'').includes(state))edit(existing.number,body);
   console.log('MONITOR ATTENTION '+file);process.exitCode=1;
  }else{
   if(existing)close(existing.number,'A recent successful monitoring run is verified: '+evidence);
   console.log('MONITOR OK '+file);
  }
 }
 await workflowCheck(titleStall,'free-tools-long-run-watchdog.yml',18,assessment);
 await workflowCheck('YorpHives Free Tools functional monitoring stalled','free-tools-functional-security.yml',30);
 await workflowCheck('YorpHives all-tools browser sweep stalled','free-tools-all-pages-browser.yml',192);
 // This is a deliberately coarse public website signal, not HQ access. It has
 // no enquiry data, counts, timestamps, addresses, or error details.
 let current=false;
 for(let attempt=0;attempt<3&&!current;attempt++){
  try{
   const res=await fetch('https://yorphives.com/api/monitoring/health',{
    method:'GET',redirect:'error',cache:'no-store',signal:AbortSignal.timeout(6500),
    headers:{accept:'application/json','user-agent':'YorpHives-Operational-Supervisor/1.0'}});
   if((res.headers.get('content-type')||'').includes('application/json')){
    const body=await res.text();if(body.length<=64)current=assessHeartbeat(res.status,JSON.parse(body));
   }
  }catch{}
  if(!current&&attempt<2)await new Promise(resolve=>setTimeout(resolve,2500));
 }
 const healthTitle='YorpHives enquiry notification checks need attention',existing=named(healthTitle);
 if(!current){
  const body=['# Enquiry notification checks need attention','',
   '@solopreneursid — the generic enquiry-service heartbeat is unavailable, stale, or reporting a problem.',
   'Open the private HQ inbox to review enquiries and investigate the notification scheduler or sender.',
   'This alert contains no customer details or counts. Email delivery is never guaranteed by this check.',
   'Evidence: '+process.env.GITHUB_SERVER_URL+'/'+repo+'/actions/runs/'+process.env.GITHUB_RUN_ID,'',
   'GitHub issue notifications depend on your GitHub notification settings.'].join('\n');
  if(!existing)create(healthTitle,body);
  console.log('ENQUIRY CHECK ATTENTION');process.exitCode=1;
 }else{
  if(existing)close(existing.number,'The coarse enquiry-service heartbeat is current again; email delivery still requires separate confirmation.');
  console.log('ENQUIRY CHECK CURRENT (delivery unverified)');
 }
}
async function firstPartyActivity(){
 try{
  const res=await fetch('https://yorphives.com/api/insights/growth',{method:'GET',
   redirect:'error',cache:'no-store',signal:AbortSignal.timeout(6500),
   headers:{accept:'application/json','user-agent':'YorpHives-ReadOnly-Weekly-Briefing/1.0'}});
  if(!res.ok||!(res.headers.get('content-type')||'').includes('application/json'))throw Error('Unavailable');
  if(Number(res.headers.get('content-length')||0)>64000)throw Error('Response too large');
  const body=await res.text();if(body.length>64000)throw Error('Response too large');
  const x=JSON.parse(body);
  const c=x.comparison||{},counts=['recent7dPageViews','previous7dPageViews','recent7dCompletedActions','previous7dCompletedActions'];
  if(x.schemaVersion!==1||x.available!==true||x.periodDays!==30||
     !counts.every(k=>Number.isSafeInteger(c[k])&&c[k]>=0)||!Number.isFinite(Date.parse(x.generatedAt||''))||
     Date.now()-Date.parse(x.generatedAt)>36*3600000)throw Error('Unverified or stale');
  // This is a measurement-quality hint only: visits can occur without
  // processing, and privacy choices can suppress anonymous event reporting.
  // An investigation is warranted only after meaningful per-tool traffic.
  const trackedViews=Array.isArray(x.toolPageViews)?x.toolPageViews
   .filter(t=>/^tools\/[a-z0-9-]+\/$/.test(String(t.url||''))&&
      Number.isSafeInteger(t.pageViews7d)&&t.pageViews7d>=0)
   .reduce((total,t)=>total+t.pageViews7d,0):0;
  const qualityNote=trackedViews>=30&&c.recent7dCompletedActions===0?
   '- Measurement review suggested: '+trackedViews+
    ' tracked Free Tools pageviews and zero browser-reported completions. Inspect an actual success flow before assuming zero usage.':
   '- Completion-measurement assessment: insufficient tool-specific evidence to flag a problem. Missing events do not prove zero usage.';
  return ['## First-party usage snapshot',
   '- Sitewide browser-reported pageviews (7 days): '+c.recent7dPageViews+' (previous 7 days: '+c.previous7dPageViews+')',
   '- Browser-reported tool completions (7 days): '+c.recent7dCompletedActions+' (previous 7 days: '+c.previous7dCompletedActions+')',
   '- Tool-level completion rankings: '+(Array.isArray(x.ranked)?x.ranked.filter(t=>String(t.url||'').startsWith('tools/')).length:0)+' reported entries',
   '- Free Tools with tracked pageviews (7 days): '+(Array.isArray(x.toolPageViews)&&x.toolPageViews.length?
      x.toolPageViews.filter(t=>/^tools\/[a-z0-9-]+\/$/.test(String(t.url||''))&&
      Number.isSafeInteger(t.pageViews7d)&&t.pageViews7d>=0).slice(0,5)
      .map(t=>t.url+': '+t.pageViews7d).join(', '):
      'Not yet observed individually; historical views cannot be assigned to tools.'),
   '- Verified unique visitors: not connected. Ad impressions: not connected. AdSense earnings: not connected.',
   '- Evidence: https://yorphives.com/api/insights/growth · Updated '+String(x.generatedAt).slice(0,25),
   '- Scope: pageviews are **sitewide**, not Free Tools-only; actions are anonymous browser events, not verified humans.',
   qualityNote,
   ''].join('\n');
 }catch{return ['## First-party usage snapshot',
   '- Not verified for this briefing; no traffic or earnings estimate generated.',
   '- Read-only source: https://yorphives.com/api/insights/growth',''].join('\n')}
}

if(process.argv.includes('--weekly')){
 const incident=named(titleIncident),stalled=named(titleStall),seo=named('YorpHives Free Tools SEO review');
 const usageSummary=await firstPartyActivity();
 const report=['# Free Tools — weekly founder briefing','',
 'Week starting '+new Date(now).toISOString().slice(0,10),'',
 '## Monitoring',
 '- Latest completed watchdog: '+(last?safe(last.conclusion)+' at '+safe(last.updated_at):'Not verified'),
 '- Evidence: '+link,
 '- Monitoring freshness: '+(validLast?'Recent successful run verified':'Failed, overdue or unavailable'),
 '- Critical incident issue: '+(incident?incident.html_url:'None currently open'),
 '- Independent monitoring-stall issue: '+(stalled?stalled.html_url:'None currently open'),
 '',
 usageSummary,
 '## Improvement review',
 '- SEO advisory issue: '+(seo?seo.html_url:'No open SEO issue'),
 '- Review this source report before acting. SEO warnings are not verified traffic or earnings.',
 '',
 '## Action',
 incident||stalled?'Investigate the monitoring incident before making revenue or content changes.':
 seo?'Review top SEO opportunities using real search/visitor evidence; do not bulk-edit tools.':
 'No urgent founder action indicated by these public records.',
 '',
 '## Boundaries',
 'Read-only audits and issue reports only. Actual AdSense earnings and Google Search Console rankings are not connected.',
 'This issue is a weekly dashboard briefing, not an email/SMS/push notification.',
 ].join('\n');
 const old=named(titleDigest);
 if(old)edit(old.number,report);else create(titleDigest,report);
 // Weekly mention is opt-in via the founder's GitHub notification preferences.
 // Never mention on push/bootstrap, manual tests, or twice-daily monitoring runs.
 if(process.env.GITHUB_EVENT_NAME==='schedule'){
  const newest=old||api('/repos/'+repo+'/issues?state=open&per_page=100').find(x=>x.title===titleDigest);
  if(newest?.number)cmd(['issue','comment',String(newest.number),'--repo',repo,'--body',
   '@solopreneursid — Weekly Free Tools summary is ready. '+(incident||stalled?
    'Critical monitoring needs review.':seo?'SEO improvements available to review.':'No urgent action indicated.')+
    ' Latest evidence: '+link]);
 }
 console.log('WEEKLY BRIEFING UPDATED lastStatus='+(last?.conclusion||'unknown')+' critical='+Boolean(incident||stalled)+' seo='+Boolean(seo));
}
