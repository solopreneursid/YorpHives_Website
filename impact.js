/* Public YorpHives Impact: aggregate snapshots only.
 * This module DOES NOT collect analytics events or access private financial data.
 * Data is rendered only after founder-approved publication; catalogue counts
 * use the same qualification gate as public HQventures launches.
 */
import {qualifiedProducts} from './product-policy.mjs';

const $=id=>document.getElementById(id);
const localPath=/^(?:apps|products|tools)\/[a-z0-9][a-z0-9-]*\/$/;
const dayRx=/^\d{4}-\d{2}-\d{2}$/;
const validDay=v=>typeof v==='string'&&dayRx.test(v)&&!Number.isNaN(Date.parse(v+'T00:00:00Z'))&&new Date(v+'T00:00:00Z').toISOString().slice(0,10)===v;
const verifiedCount=n=>Number.isSafeInteger(n)&&n>=0&&n<=1e9;
const setCounter=(id,value,note)=>{
 const target=$(id); if(!target)return;
 target.textContent=value===null?'—':Number(value).toLocaleString('en-US');
 if(note)$(id+'-note').textContent=note;
};
const formatter=new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'short',year:'numeric',timeZone:'UTC'});
const text=(tag,content,className)=>{
 const element=document.createElement(tag);element.textContent=content;
 if(className)element.className=className;
 return element;
};

let qualified=[];
let verifiedPublicUrls=new Set();
async function updatePublicCatalogCounts(){
 try{
  const response=await fetch('catalog.json',{cache:'no-cache'});
  if(!response.ok)throw Error('Public catalogue not available');
  const data=await response.json();
  if(!Array.isArray(data.items))throw Error('Invalid public catalogue');
  const tools=data.items.filter(x=>x?.type==='tool'&&
    x.visibility!=='private'&&x.published!==false&&localPath.test(x.url||''));
  qualified=qualifiedProducts(data.items);
  verifiedPublicUrls=new Set([...tools,...qualified].map(x=>x.url));
  setCounter('impact-tools',tools.length,'Available to use today');
  setCounter('impact-ventures',qualified.length,'Verified founder-approved launches');
 }catch{
  // Never show guessed counts when the original authoritative catalog fails.
  $('impact-tools-note').textContent='Catalogue temporarily unavailable';
  $('impact-ventures-note').textContent='Verification unavailable';
 }
}

function approvedPublication(snapshot){
 const p=snapshot?.publication;
 return snapshot?.schemaVersion===1&&p?.status==='approved'&&
  p?.approvedByFounder===true&&validDay(p.approvedAt)&&
  p.approvedAt<=new Date().toISOString().slice(0,10);
}
function renderCounters(metrics){
 if(verifiedCount(metrics?.estimatedVisitors30d))
  setCounter('impact-visitors',metrics.estimatedVisitors30d,'Estimated unique visitors · last 30 days');
 if(verifiedCount(metrics?.verifiedPartners))
  setCounter('impact-partners',metrics.verifiedPartners,'Founder-confirmed partnerships');
}

function renderMomentum(points){
 const permitted=Array.isArray(points)&&points.length>=3&&points.length<=12&&points.every(p=>
  typeof p?.month==='string'&&/^\d{4}-(?:0[1-9]|1[0-2])$/.test(p.month)&&
  [-1,0,1].includes(p.direction));
 if(!permitted)return;
 const months=points.map(p=>p.month);
 if(new Set(months).size!==months.length || months.some((x,i)=>i>0&&months[i-1]>=x))return;
 // Values encode up/flat/down only. No absolute amounts, scaled revenue,
 // indexed revenue, percentages or numeric financial tooltips leave HQ.
 let y=2;
 const xy=points.map((p,i)=>{
  y=Math.max(.4,Math.min(3.6,y-p.direction*.68));
  return {x:22+i*616/(points.length-1),y:15+y*38};
 });
 const poly=xy.map((p,i)=>(i?'L':'M')+p.x.toFixed(1)+','+p.y.toFixed(1)).join(' ');
 const area=poly+' L'+xy[xy.length-1].x.toFixed(1)+',184 L22,184 Z';
 $('impact-trend-line').setAttribute('d',poly);
 $('impact-trend-area').setAttribute('d',area);
 const labels=$('impact-revenue-months');
 labels.replaceChildren(...points.map(p=>{
  const [year,month]=p.month.split('-');
  return text('span',new Date(Date.UTC(Number(year),Number(month)-1,1)).toLocaleDateString('en-GB',{month:'short',timeZone:'UTC'}));
 }));
 $('impact-revenue-empty').hidden=true;
 $('impact-revenue-chart').hidden=false;
 $('impact-trend-status').textContent='Founder-reviewed direction';
}

function renderApps(entries){
 if(!Array.isArray(entries))return;
 // Ranking must correspond to an actual, founder-approved public product.
 const available=new Map(qualified.map(x=>[x.url,x]));
 const unique=new Set(),nodes=[];
 for(const entry of entries.slice(0,6)){
  if(!entry||typeof entry.url!=='string'||!available.has(entry.url)||unique.has(entry.url))continue;
  unique.add(entry.url);
  const approved=available.get(entry.url);
  const card=text('div','','impact-app-item');
  const rank=text('span',String(nodes.length+1).padStart(2,'0'),'impact-app-order');
  const a=document.createElement('a');a.href=approved.url;
  a.append(text('strong',approved.name),text('small','Verified application usage'));
  const arrow=text('span','↗','impact-app-arrow');arrow.setAttribute('aria-hidden','true');
  card.append(rank,a,arrow);
  nodes.push(card);
  if(nodes.length===3)break;
 }
 if(nodes.length)$('impact-apps').replaceChildren(...nodes);
}

function renderMilestones(entries){
 if(!Array.isArray(entries))return;
 const nodes=[],used=new Set();
 for(const entry of entries.slice(0,12)){
  if(!entry||!validDay(entry.date)||entry.date>new Date().toISOString().slice(0,10)||
     typeof entry.title!=='string'||entry.title.length<5||entry.title.length>90||
     typeof entry.summary!=='string'||entry.summary.length<8||entry.summary.length>160||
     typeof entry.proofUrl!=='string'||!verifiedPublicUrls.has(entry.proofUrl)||
     used.has(entry.proofUrl+entry.date))continue;
  // Milestone evidence must be a genuinely public catalog item.
  // Proof paths are not accepted from arbitrary or external websites.
  used.add(entry.proofUrl+entry.date);
  const row=text('div','','impact-milestone-item');
  const time=text('time',formatter.format(new Date(entry.date+'T00:00:00Z')));
  time.dateTime=entry.date;
  const body=document.createElement('div');
  const link=document.createElement('a');link.href=entry.proofUrl;link.append(text('strong',entry.title));
  body.append(link,text('small',entry.summary));
  row.append(time,body);nodes.push(row);
  if(nodes.length===4)break;
 }
 if(nodes.length)$('impact-milestone-list').replaceChildren(...nodes);
}

async function loadApprovedSnapshot(){
 try{
  const r=await fetch('impact-public.json',{cache:'no-store'});
  if(!r.ok)throw Error('No public snapshot');
  const d=await r.json();
  if(!approvedPublication(d))return;
  renderCounters(d.metrics);
  renderMomentum(d.revenueDirection);
  renderApps(d.trendingApps);
  renderMilestones(d.milestones);
  $('impact-updated').textContent='Reviewed '+formatter.format(new Date(d.publication.approvedAt+'T00:00:00Z'));
 }catch{
  // The public interface remains honest when the data source is absent.
 }
}

await updatePublicCatalogCounts();
await loadApprovedSnapshot();
