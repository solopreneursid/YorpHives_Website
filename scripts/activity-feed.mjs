// Dependency-free public activity registry for the static website.
// Every output item corresponds to a route included in this release.
// Nothing here fetches HQ private data or publishes draft/member records.
import {execFileSync} from 'node:child_process';
import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';

const exactDate=/^\d{4}-\d{2}-\d{2}$/;
const dayStart=s=>exactDate.test(s)?Date.parse(s+'T00:00:00Z'):NaN;
const isoTime=s=>typeof s==='string'&&Number.isFinite(Date.parse(s))?Date.parse(s):NaN;
const esc=s=>String(s).replace(/[&<>"']/g,c=>({
  '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
}[c]));
const safeText=s=>typeof s==='string'&&s.trim().length>=3&&s.length<=90&&!/[<>]/.test(s);
const git=(root,args)=>{
  try{return execFileSync('git',args,{cwd:root,encoding:'utf8',stdio:['ignore','pipe','ignore'],timeout:5000,maxBuffer:12*1024*1024}).trim();}
  catch{return '';}
};
const areaHtml=(html,area)=>{
  if(typeof html!=='string')return '';
  const a=area==='builders'
    ?'<section class="page" id="builders"'
    :'<section class="page" id="explore"';
  const b=area==='builders'
    ?'<section class="page" id="connect"'
    :'<section class="page" id="builders"';
  const i=html.indexOf(a),j=html.indexOf(b,i+a.length);
  return i>=0&&j>i?html.slice(i,j):'';
};
const areaStyle=(style,area)=>{
  if(typeof style!=='string')return '';
  const selectors=area==='builders'
    ?/(?:#builders\b|#home \.builders-home\b|#home \.builders-home-card\b)/
    :/(?:#explore\b|#home \.explore-spotlight\b|#home \.home-feature\b|#home \.explore-showcase\b)/;
  return [...style.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
    .filter(m=>selectors.test(m[1]))
    .map(m=>m[1].replace(/\s+/g,' ').trim()+'{'+m[2].replace(/\s+/g,' ').trim()+'}')
    .join('\n');
};

// Scan public page/content changes, not merely commits mentioning those pages.
// This prevents test-only commits or private HQ work becoming public updates.
// Git is optional: a shallow or export-only checkout falls back to curated notes.
export function discoverPublicPageUpdates(root,limit=80){
  const log=git(root,['log','-n',String(limit),'--format=%H%x09%cI','--','index.html','style.css']);
  if(!log)return [];
  const commits=log.split('\n').map(line=>{
    const [sha,time]=line.split('\t');
    return /^[a-f0-9]{40}$/.test(sha||'')&&Number.isFinite(isoTime(time))?{sha,time}:null;
  }).filter(Boolean);
  const found=new Map();
  let later=null;
  const readRevision=(sha,file)=>git(root,['show',sha+':'+file]);
  for(const commit of commits){
    const html=readRevision(commit.sha,'index.html');
    const css=readRevision(commit.sha,'style.css');
    const current={
      builders:areaHtml(html,'builders')+areaStyle(css,'builders'),
      explore:areaHtml(html,'explore')+areaStyle(css,'explore')
    };
    if(later)for(const area of ['builders','explore']){
      if(!found.has(area)&&later[area]&&later[area]!==current[area]){
        found.set(area,{
          id:'page:'+area,
          kind:area,
          title:area==='builders'?'Builders page updated':'Explore collection updated',
          url:area==='builders'?'#builders':'#explore',
          timestamp:later.time,
          source:'public-page-diff'
        });
      }
    }
    later={...current,time:commit.time};
    if(found.size===2)break;
  }
  return [...found.values()];
}

// The last committed change to each published tool's own directory provides
// a refresh signal even when an editor forgets to maintain updatedAt.
export function discoverToolEditTimes(root,limit=220){
  const log=git(root,['log','-n',String(limit),'--format=@@%cI','--name-only','--','tools/']);
  const found=new Map();
  let timestamp='';
  for(const line of log.split('\n')){
    if(line.startsWith('@@')){timestamp=line.slice(2);continue;}
    const match=line.match(/^tools\/([a-z0-9][a-z0-9-]*)\//);
    if(match&&Number.isFinite(isoTime(timestamp))){
      const url='tools/'+match[1]+'/';
      if(!found.has(url))found.set(url,timestamp);
    }
  }
  return Object.fromEntries(found);
}

function validPublicEvent(item,allowed,now){
  if(!item||!['builders','explore','tools'].includes(item.kind)||!safeText(item.title))
    return false;
  if(!Number.isFinite(isoTime(item.timestamp))||isoTime(item.timestamp)>now)return false;
  if(item.kind==='builders')return item.url==='#builders';
  if(item.kind==='explore')return item.url==='#explore';
  return allowed.has(item.url);
}
export function collectPublicActivity({published,notes=[],pageChanges=[],toolEditTimes={},now=Date.now(),max=10}){
  const validItems=(Array.isArray(published)?published:[]).filter(x=>
    x?.type==='tool'&&typeof x.name==='string'&&x.name.trim().length>=3&&
    x.name.length<=80&&typeof x.url==='string'&&/^tools\/[a-z0-9][a-z0-9-]*\/$/.test(x.url)&&
    Number.isFinite(dayStart(x.date))&&dayStart(x.date)<=now
  );
  const toolPaths=new Set(validItems.map(x=>x.url));
  const candidates=validItems.map((tool,index)=>{
    const created=dayStart(tool.date);
    const explicit=isoTime(tool.updatedAt);
    const detected=isoTime(toolEditTimes[tool.url]);
    const recent=[explicit,detected].filter(t=>Number.isFinite(t)&&t<=now);
    const modified=Math.max(created,...recent);
    const updated=(Number.isFinite(explicit)&&explicit>created)||
      (Number.isFinite(detected)&&new Date(detected).toISOString().slice(0,10)>tool.date);
    return {id:'tool:'+tool.url,kind:'tools',
      title:(updated?'Updated: ':'Added: ')+tool.name,
      url:tool.url,timestamp:new Date(modified).toISOString(),
      source:'published-catalog',index};
  });
  const fallback=[
    ...pageChanges.filter(x=>validPublicEvent(x,toolPaths,now)),
    ...notes.filter(x=>validPublicEvent(x,toolPaths,now))
  ];
  // One public change event per section; the latest verified source wins.
  for(const area of ['builders','explore']){
    const matches=fallback.filter(x=>x.kind===area)
      .sort((a,b)=>isoTime(b.timestamp)-isoTime(a.timestamp));
    if(matches[0])candidates.push(matches[0]);
  }
  for(const note of fallback.filter(x=>x.kind==='tools'))
    candidates.push(note);
  const uniq=new Map();
  for(const x of candidates){
    const old=uniq.get(x.id);
    if(!old||isoTime(x.timestamp)>isoTime(old.timestamp))uniq.set(x.id,x);
  }
  return [...uniq.values()]
    .sort((a,b)=>isoTime(b.timestamp)-isoTime(a.timestamp)||
      (b.index??-1)-(a.index??-1)||a.title.localeCompare(b.title))
    .slice(0,Math.max(0,Math.min(10,max)))
    .map(({id,kind,title,url,timestamp,source})=>({id,kind,title,url,timestamp,source}));
}
export async function loadActivityNotes(root){
  const parsed=JSON.parse(await readFile(resolve(root,'public-activity.json'),'utf8'));
  if(!Array.isArray(parsed.events))throw Error('Public activity notes must contain events array');
  return parsed.events;
}
export function renderFooterPulse(items){
  const events=Array.isArray(items)?items:[];
  const one=({duplicate=false})=>'<div class="pulse-items"'+(duplicate?' aria-hidden="true"':'')+'>'+
    events.map(e=>'<a class="pulse-item pulse-'+esc(e.kind)+
      '" href="'+esc(e.url)+'" title="'+esc(e.title)+'"'+(duplicate?' tabindex="-1"':'')+'>'+
      '<span class="pulse-kind">'+esc(e.kind==='tools'?'TOOLS':e.kind.toUpperCase())+'</span>'+
      '<span class="pulse-title">'+esc(e.title)+'</span>'+
      '<time class="pulse-date" datetime="'+esc(e.timestamp.slice(0,10))+'">'+
        esc(new Date(e.timestamp).toLocaleDateString('en-GB',{day:'numeric',month:'short',timeZone:'UTC'}))+'</time>'+
      '<span class="pulse-arrow" aria-hidden="true">↗</span></a>').join('')+'</div>';
  const count=events.length;
  return '<div class="pulse-label"><span class="pulse-signal" aria-hidden="true"></span>'+
    '<span class="pulse-heading"><b>YHpulse</b><small>LATEST '+count+' UPDATES</small></span></div>'+
    '<div class="pulse-viewport" aria-label="YHpulse latest public website updates">'+
      '<div class="pulse-track'+(count<2?' is-static':'')+'">'+
      (count?one({})+(count>1?one({duplicate:true}):''):
        '<p class="pulse-empty">Published updates will appear here.</p>')+
      '</div></div>';
}
