import {test} from 'node:test';
import {strict as assert} from 'node:assert';
import {readFile} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {collectPublicActivity,renderFooterPulse,renderHomePulse,loadActivityNotes} from '../scripts/activity-feed.mjs';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const read=p=>readFile(resolve(root,p),'utf8');
const instant=Date.parse('2026-11-15T23:00:00Z');
const tool=(name,n,date='2026-11-15')=>({
 name,type:'tool',category:'Creator',description:'Local utility for testing',
 url:'tools/example-'+n+'/',date,published:true
});
const notes=[
 {id:'page:builders',kind:'builders',title:'Builders membership updated',url:'#builders',timestamp:'2026-11-15T14:00:00Z'},
 {id:'page:explore',kind:'explore',title:'Explore collection updated',url:'#explore',timestamp:'2026-11-15T13:00:00Z'}
];

test('public activity selects twenty verified recent changes without fixed featured-tool links',()=>{
 const items=Array.from({length:24},(_,i)=>tool('Example Tool '+i,i));
 const result=collectPublicActivity({published:items,notes,now:instant});
 assert.equal(result.length,20);
 assert.equal(result[0].kind,'builders');
 assert.equal(result[1].kind,'explore');
 assert.equal(result.filter(x=>x.kind==='tools').length,18);
 assert.ok(result.every(x=>x.url.startsWith('tools/')||x.url==='#builders'||x.url==='#explore'));
 assert.ok(result.every(x=>Number.isFinite(Date.parse(x.timestamp))));
});

test('YHpulse caps at twenty, even when a larger maximum is requested',()=>{
 const published=Array.from({length:32},(_,i)=>tool('Cap Test '+i,i));
 assert.equal(collectPublicActivity({published,now:instant,max:99}).length,20);
 assert.equal(collectPublicActivity({published,now:instant,max:7}).length,7);
});

test('new catalog additions join feed automatically, tool updates sort by verified timestamp',()=>{
 const first=tool('First Tool',1,'2026-11-12');
 const second=tool('Second Tool',2,'2026-11-13');
 const next=tool('Fresh Tool',3,'2026-11-15');
 const toolEditTimes={};
 toolEditTimes[first.url]='2026-11-15T16:02:00Z';
 const result=collectPublicActivity({published:[first,second,next],notes:[],toolEditTimes,now:instant});
 assert.equal(result[0].url,first.url);
 assert.match(result[0].title,/^Updated: /);
 assert.equal(result[1].url,next.url);
 assert.match(result[1].title,/^Added: /);
 assert.equal(result[2].url,second.url);
 const newer=collectPublicActivity({published:[first,second,next,tool('Fourth Tool',4,'2026-11-15')],now:instant});
 assert.equal(newer.length,4);
 assert.ok(newer.some(x=>x.title.includes('Fourth Tool')));
});

test('private or unregistered activity and future/forged notes never enter the public feed',()=>{
 const published=[tool('Safe Tool',1)];
 const incoming=[
  {id:'forged',kind:'builders',title:'Private job opportunity',url:'/jobs/secret',timestamp:'2026-11-15T14:00:00Z'},
  {id:'draft',kind:'explore',title:'Unapproved draft product',url:'tools/missing/',timestamp:'2026-11-15T14:00:00Z'},
  {id:'future',kind:'tools',title:'A future release',url:'tools/example-1/',timestamp:'2029-01-01T00:00:00Z'},
  {id:'script',kind:'tools',title:'<script>bad</script>',url:'tools/example-1/',timestamp:'2026-11-15T14:00:00Z'}
 ];
 const result=collectPublicActivity({published,notes:incoming,now:instant});
 assert.deepEqual(result.map(x=>x.title),['Added: Safe Tool']);
});

test('when Git detects a newer page change it replaces the fallback event',()=>{
 const history=[{id:'page:builders',kind:'builders',title:'Builders page updated',
  url:'#builders',timestamp:'2026-11-15T17:00:00Z'}];
 const result=collectPublicActivity({published:[],notes,pageChanges:history,now:instant});
 assert.equal(result.length,2);
 assert.equal(result[0].title,'Builders page updated');
 assert.equal(result.filter(x=>x.kind==='builders').length,1);
});

test('generated footer is clickable, escaped and has a non-focusable duplicate set',()=>{
 const samples=collectPublicActivity({published:[tool('Writer & Reader',4)],notes,now:instant});
 const html=renderFooterPulse(samples);
 assert.match(html,/<b>YHpulse<\/b>/);
 assert.match(html,/LATEST 3 UPDATES/);
 assert.match(html,/href="#builders"/);
 assert.match(html,/href="#explore"/);
 assert.match(html,/href="tools\/example-4\/"/);
 assert.match(html,/Writer &amp; Reader/);
 assert.equal((html.match(/class="pulse-items"/g)||[]).length,2);
 assert.match(html,/aria-hidden="true"/);
 assert.equal((html.match(/tabindex="-1"/g)||[]).length,3);
 assert.equal(renderFooterPulse([]).includes('Published updates will appear here.'),true);
});

test('the homepage pulse contains only the scrolling verified links, no extra header',()=>{
 const items=collectPublicActivity({published:[tool('Writer & Reader',4)],notes,now:instant});
 const track=renderHomePulse(items);
 assert.match(track,/class="pulse-track/);
 assert.match(track,/href="tools\/example-4\//);
 assert.equal((track.match(/class="pulse-items"/g)||[]).length,2);
 assert.doesNotMatch(track,/<b>YHpulse<\/b>/);
 assert.doesNotMatch(track,/class="pulse-viewport"/);
});

test('source has one homepage pulse and no duplicate footer ticker',async()=>{
 const html=await read('index.html'),css=await read('style.css'),build=await read('scripts/build-site.mjs');
 assert.doesNotMatch(html,/id="footer-pulse"/);
 assert.match(html,/id="home-pulse-viewport"/);
 assert.match(html,/<!-- PULSE_START -->/);
 assert.match(html,/<!-- PULSE_END -->/);
 assert.doesNotMatch(html,/class="footer-directory"/);
 assert.doesNotMatch(html,/<nav class="footer-directory" aria-label="Free tools"/);
 assert.match(build,/renderHomePulse\(activity\)/);
 assert.match(build,/await write\('activity.json'/);
 assert.match(build,/discoverToolEditTimes\(root\)/);
 assert.match(build,/discoverPublicPageUpdates\(root\)/);
 assert.match(css,/grid-template-columns:190px minmax\(0,1fr\)/);
 assert.match(css,/@keyframes pulse-marquee/);
 assert.match(css,/\.footer-pulse:hover \.pulse-track/);
 assert.match(css,/prefers-reduced-motion:reduce/);
 const fallback=await loadActivityNotes(root);
 assert.ok(fallback.every(x=>['builders','explore'].includes(x.kind)));
});

test('deployed release activity and HTML agree and link only to published public routes',async()=>{
 const catalog=JSON.parse(await read('dist/catalog.json'));
 const activity=JSON.parse(await read('dist/activity.json'));
 const homepage=await read('dist/index.html');
 const urls=new Set(catalog.items.map(x=>x.url));
 assert.equal(activity.items.length,20);
 assert.ok(activity.items.every(x=>urls.has(x.url)||x.url==='#builders'||x.url==='#explore'));
 assert.ok(activity.items.every(x=>x.source==='published-catalog'||x.source==='public-page-diff'||x.source==='founder-visible-page'));
 if(homepage.includes('id="home-title"')){
  // The reimagined home renders a smaller verified feed using the local
  // activity JSON; not all published events belong in initial HTML.
  const js=await read('dist/studio.js');
  assert.match(homepage,/id="home-activity"/);
  assert.match(js,/fetch\('\.\.\/activity\.json'/);
  assert.match(js,/renderActivity\(d\.items\)/);
 }else{
  assert.ok(activity.items.every(x=>homepage.includes('href="'+x.url+'"')));
  assert.ok(homepage.includes('LATEST 20 UPDATES'));
 }
 assert.doesNotMatch(homepage,/href="catalog\.json">Tool catalog/);
 assert.doesNotMatch(homepage,/<nav class="footer-directory"/);
});
