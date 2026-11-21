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
  const body=['# Independent Free Tools watchdog supervisor','', '**Attention required:** No completed main monitoring run in the past 18 hours.',
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
if(process.argv.includes('--weekly')){
 const incident=named(titleIncident),stalled=named(titleStall),seo=named('YorpHives Free Tools SEO review');
 const report=['# Free Tools — weekly founder briefing','',
 'Week starting '+new Date(now).toISOString().slice(0,10),'',
 '## Monitoring',
 '- Latest completed watchdog: '+(last?safe(last.conclusion)+' at '+safe(last.updated_at):'Not verified'),
 '- Evidence: '+link,
 '- Monitoring freshness: '+(validLast?'Recent completed run verified':'Overdue or unavailable'),
 '- Critical incident issue: '+(incident?incident.html_url:'None currently open'),
 '- Independent monitoring-stall issue: '+(stalled?stalled.html_url:'None currently open'),
 '',
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
 console.log('WEEKLY BRIEFING UPDATED lastStatus='+(last?.conclusion||'unknown')+' critical='+Boolean(incident||stalled)+' seo='+Boolean(seo));
}
