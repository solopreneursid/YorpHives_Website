// Read-only evidence collection, with GitHub issue-only notifications.
// Never modifies a website, AdSense, production config, or a repository file.
import {execFileSync} from 'node:child_process';
const repo=process.env.GITHUB_REPOSITORY;
if(repo!=='solopreneursid/YorpHives_Website')throw Error('Unexpected GitHub repository');
if(!process.env.GH_TOKEN)throw Error('GitHub Actions issue token unavailable');
const cmd=(args,opts={})=>execFileSync('gh',args,{encoding:'utf8',timeout:30000,maxBuffer:6e6,...opts}).trim();
const api=(path)=>JSON.parse(cmd(['api','--method','GET',path]));
const now=Date.now(),hour=3600000;
const titleIncident='YorpHives Free Tools watchdog failure',titleStall='YorpHives Free Tools monitoring stalled';
const titleDigest='YorpHives Free Tools weekly briefing';
const recent=api('/repos/'+repo+'/actions/workflows/free-tools-long-run-watchdog.yml/runs?per_page=10');
const runs=Array.isArray(recent.workflow_runs)?recent.workflow_runs:[];
const completed=runs.filter(x=>x.status==='completed'&&Number.isFinite(Date.parse(x.updated_at))).sort((a,b)=>Date.parse(b.updated_at)-Date.parse(a.updated_at));
const last=completed[0]||null;
const ageHours=last?(now-Date.parse(last.updated_at))/hour:Infinity;
const validLast=last&&ageHours>=-0.25&&ageHours<18;
const open=api('/repos/'+repo+'/issues?state=open&per_page=100').filter(x=>!x.pull_request);
const named=title=>open.find(x=>x.title===title);
const edit=(n,body)=>cmd(['issue','edit',String(n),'--repo',repo,'--body',body]);
const create=(title,body)=>cmd(['issue','create','--repo',repo,'--title',title,'--body',body]);
const close=(n,note)=>cmd(['issue','close',String(n),'--repo',repo,'--comment',note]);
const safe=s=>String(s||'').replace(/[\r\n]/g,' ').slice(0,240);
const link=last?.html_url||'https://github.com/'+repo+'/actions/workflows/free-tools-long-run-watchdog.yml';
const age=Number.isFinite(ageHours)?ageHours.toFixed(1)+' hours':'unknown';
if(process.argv.includes('--supervise')){
 const existing=named(titleStall);
 if(!validLast){
  const body=['# Independent Free Tools watchdog supervisor','', '@solopreneursid — **attention required:** No completed main monitoring run in the past 18 hours.',
   'Last completion: '+safe(last?.updated_at||'not observed')+'. Age: '+age+'.',
   'Evidence: '+link,'',
   'This does not prove the tools are broken; monitoring reliability is unverified.',
   'Investigate GitHub Actions schedule and the workflow, then confirm the next completed run.',
   'No website, ad setting, or production configuration was changed.'].join('\n');
  if(!existing)create(titleStall,body);
  else if(!String(existing.body||'').includes(safe(last?.updated_at||'not observed')))edit(existing.number,body);
  console.log('SUPERVISOR STALLED '+age);process.exitCode=1;
 }else{
  if(existing)close(existing.number,'Monitoring resumed. Completed workflow evidence: '+link);
  console.log('SUPERVISOR OK '+age+' last='+last.conclusion);
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
 '- Monitoring freshness: '+(validLast?'Recent completed run verified':'Overdue or unavailable'),
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
