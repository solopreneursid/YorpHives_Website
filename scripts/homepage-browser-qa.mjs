// Cross-browser responsive QA for the YorpHives Fresh release candidate.
// Runs against local dist/ only. Synthetic content; no live writes or external services.
import assert from 'node:assert/strict';
import {chromium,firefox,webkit} from 'playwright';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';

const root=resolve('dist');
const mime={'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.mjs':'text/javascript','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.ico':'image/x-icon'};
const server=createServer(async(req,res)=>{
 try{
  const path=decodeURIComponent(new URL(req.url,'http://local').pathname);
  const file=resolve(root,'.'+path,path.endsWith('/')?'index.html':'');
  if(!file.startsWith(root+sep)){res.writeHead(403).end();return}
  const data=await readFile(file);
  res.writeHead(200,{'content-type':mime[extname(file)]||'application/octet-stream'});
  res.end(data);
 }catch{res.writeHead(404).end()}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const origin='http://127.0.0.1:'+server.address().port;
const screens=[['small-phone',320,700],['phone',360,800],['large-phone',430,932],['tablet',768,1024],['laptop',1280,800],['desktop',1440,900],['wide',1920,1080]];
const problems=[];
const engines={chromium,firefox,webkit};

for(const [engineName,engine] of Object.entries(engines)){
 let browser;
 try{browser=await engine.launch({headless:true})}catch(error){problems.push(engineName+' launch: '+error.message);continue}
 for(const [screen,width,height] of screens){
  let context;
  try{
   const mobile=width<=760;
   context=await browser.newContext({viewport:{width,height},reducedMotion:'reduce',isMobile:mobile,hasTouch:mobile});
   const page=await context.newPage(),errors=[],external=[];
   page.on('pageerror',error=>errors.push(error.message));
   page.on('request',request=>{if(new URL(request.url()).origin!==origin)external.push(request.url())});
   await page.goto(origin+'/',{waitUntil:'domcontentloaded',timeout:25000});
   await page.locator('#home').waitFor({state:'visible'});
   await page.locator('#featured-tools-grid .featured-tool-card').first().waitFor({timeout:15000});
   const home=await page.evaluate(()=>({
    width:document.documentElement.clientWidth,
    scroll:document.documentElement.scrollWidth,
    featured:document.querySelectorAll('#featured-tools-grid .featured-tool-card').length,
    nav:document.querySelectorAll('.desktop-nav a').length,
    dock:document.querySelectorAll('.mobile-dock a').length,
    heading:!!document.querySelector('#home-title'),
    count:document.querySelector('#home-tool-count')?.textContent
   }));
   const label=engineName+'/'+screen;
   if(home.scroll>home.width+2)problems.push(label+' homepage horizontal overflow '+home.scroll+'/'+home.width);
   if(home.featured!==4)problems.push(label+' expected four featured tools, found '+home.featured);
   if(home.nav!==4)problems.push(label+' desktop navigation count changed');
   if(home.dock!==4)problems.push(label+' four-item mobile navigation missing');
   if(!home.heading||!home.count||home.count==='—')problems.push(label+' homepage identity or catalogue count missing');
   if(mobile){
    const dock=await page.evaluate(()=>{
     const node=document.querySelector('.mobile-dock'),box=node.getBoundingClientRect(),style=getComputedStyle(node);
     const buttons=[...node.querySelectorAll('a')].map(item=>item.getBoundingClientRect());
     return {display:style.display,columns:style.gridTemplateColumns.split(' ').length,
      count:buttons.length,minHeight:Math.min(...buttons.map(item=>item.height)),
      equal:buttons.every(item=>Math.abs(item.width-buttons[0].width)<1.5),
      within:buttons.every(item=>item.left>=box.left&&item.right<=box.right)};
    });
    if(dock.display==='none'||dock.columns!==4||dock.count!==4||dock.minHeight<44||!dock.equal||!dock.within)
     problems.push(label+' mobile dock layout or touch targets invalid '+JSON.stringify(dock));
    const toggle=page.locator('#menu-toggle');
    await toggle.click();
    if(await page.locator('#mobile-menu').isHidden())problems.push(label+' mobile menu did not open');
    await page.keyboard.press('Escape');
    if(!(await page.locator('#mobile-menu').isHidden()))problems.push(label+' Escape did not close mobile menu');
   }
   for(const view of ['tools','ventures','partners','contact']){
    await page.evaluate(id=>{location.hash='#'+id},view);
    await page.waitForFunction(id=>location.hash==='#'+id&&!document.getElementById(id).hidden,view);
    const dimensions=await page.evaluate(()=>({width:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth}));
    if(dimensions.scroll>dimensions.width+2)problems.push(label+' '+view+' overflow '+JSON.stringify(dimensions));
   }
   await page.evaluate(()=>{location.hash='#tools'});
   await page.waitForFunction(()=>location.hash==='#tools'&&!document.getElementById('tools').hidden);
   await page.locator('#tool-search').fill('qr');
   await page.waitForFunction(()=>document.querySelectorAll('#tool-results .tool-card').length>0);
   const results=await page.locator('#tool-results .tool-card').count();
   if(results<1)problems.push(label+' tool search returned no QR matches');
   await page.locator('#saved-toggle').click();
   if(await page.locator('#saved-toggle').getAttribute('aria-pressed')!=='true')problems.push(label+' saved-tools filter did not activate');
   await page.locator('#reset-tool-filters').click();
   if(await page.locator('#saved-toggle').getAttribute('aria-pressed')!=='false')problems.push(label+' reset did not clear saved filter');
   await page.goto(origin+'/tools/',{waitUntil:'domcontentloaded',timeout:25000});
   await page.locator('#directory-search').waitFor();
   await page.locator('#directory-search').fill('pdf');
   await page.waitForFunction(()=>document.querySelector('#directory-search-status').textContent.includes('match'));
   const directory=await page.evaluate(()=>({width:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth,cards:[...document.querySelectorAll('.directory-card')].filter(node=>!node.hidden).length}));
   if(directory.scroll>directory.width+2)problems.push(label+' directory horizontal overflow '+JSON.stringify(directory));
   if(directory.cards<1)problems.push(label+' directory search returned no PDF tools');
   await page.goto(origin+'/tools/word-counter/',{waitUntil:'domcontentloaded',timeout:25000});
   await page.locator('textarea[name="text"]').fill('One two three four');
   await page.waitForFunction(()=>!document.querySelector('#utility-run')?.disabled,null,{timeout:15000});
   await page.locator('#utility-run').click();
   await page.waitForFunction(()=>!document.querySelector('#utility-result')?.hidden,null,{timeout:15000});
   assert.match(await page.locator('#utility-output').inputValue(),/4/);
   const toolLayout=await page.evaluate(()=>({width:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth,dock:document.querySelectorAll('.mobile-dock a').length}));
   if(toolLayout.scroll>toolLayout.width+2)problems.push(label+' direct tool horizontal overflow '+JSON.stringify(toolLayout));
   if(toolLayout.dock!==4)problems.push(label+' direct tool mobile navigation missing');
   if(errors.length)problems.push(label+' JS errors: '+errors.slice(0,3).join(' | '));
   if(external.length)problems.push(label+' unexpected external requests: '+external.slice(0,2).join(', '));
   if(screen==='phone'||screen==='desktop')await page.screenshot({path:'qa-fresh-'+engineName+'-'+screen+'.png',fullPage:true});
   console.log('PASS '+label+' — home '+home.width+'px, '+home.featured+' featured tools, directory '+directory.cards+' matches');
  }catch(error){problems.push(engineName+'/'+screen+': '+String(error?.message||error).slice(0,300))}
  finally{await context?.close()}
 }
 await browser.close();
}
await new Promise(resolve=>server.close(resolve));
if(problems.length){
 console.error('FRESH BROWSER QA FAILED\n'+problems.map(item=>' - '+item).join('\n'));
 process.exitCode=1;
}else console.log('FRESH BROWSER QA PASSED: '+(Object.keys(engines).length*screens.length)+' engine/viewport combinations.');
