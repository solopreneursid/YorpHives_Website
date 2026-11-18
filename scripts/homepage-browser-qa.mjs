// Browser QA uses the local preview build only. No data leaves the test runner.
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
const screens=[['small-phone',320,700],['phone',390,844],['large-phone',430,932],['tablet',768,1024],['landscape-tablet',1024,768],['laptop',1280,800],['desktop',1440,900],['wide',1920,1080]];
const problems=[];
for(const [engineName,engine] of Object.entries({chromium,firefox,webkit})){
 let browser;
 try{browser=await engine.launch()}catch(e){problems.push(engineName+' launch: '+e.message);continue}
 for(const [name,width,height] of screens){
  let context;
  try{
   const settings={viewport:{width,height},reducedMotion:'reduce'};
   if(engineName!=='firefox'&&width<=1024){settings.isMobile=true;settings.hasTouch=true}
   context=await browser.newContext(settings);
   const page=await context.newPage();
   const errors=[];
   page.on('pageerror',error=>errors.push(error.message));
   await page.goto(origin+'/',{waitUntil:'domcontentloaded',timeout:25000});
   await page.locator('#home').waitFor({state:'visible'});
   await page.waitForTimeout(450);
   const result=await page.evaluate(()=>({
    width:document.documentElement.clientWidth,
    scrollWidth:document.documentElement.scrollWidth,
    tools:document.querySelectorAll('#home .featured-tool-card').length,
    hasKofi:!!document.querySelector('#kofi-support'),
    hasContact:!!document.querySelector('a[href="#contact"]'),
    hasAnalytics:!!document.querySelector('#anonymous-analytics-toggle'),
    tickerGroups:document.querySelectorAll('#eco-strip-tools .eco-ticker-group').length
   }));
   const label=engineName+'/'+name;
   if(result.scrollWidth>result.width+2)problems.push(label+' overflow '+result.scrollWidth+'/'+result.width);
   if(width<=430){
    const mobile=await page.evaluate(()=>{
     const hero=document.querySelector('#home .home-hero');
     const art=document.querySelector('#home .hero-art');
     const dock=document.querySelector('.mobile-dock');
     const heroBox=hero.getBoundingClientRect();
     return {heroHeight:heroBox.height,artHidden:getComputedStyle(art).display==='none',artHeight:art.getBoundingClientRect().height,dockHeight:dock.getBoundingClientRect().height,dockInset:dock.getBoundingClientRect().left,dockButtonHeight:dock.querySelector('a').getBoundingClientRect().height};
    });
    if(mobile.artHidden)problems.push(label+' mobile brand orbit missing');
    if(mobile.artHeight>160)problems.push(label+' oversized mobile brand orbit '+mobile.artHeight.toFixed(0));
    if(mobile.heroHeight>height-55)problems.push(label+' oversized hero '+mobile.heroHeight.toFixed(0)+'/'+height);
    if(mobile.dockHeight>60)problems.push(label+' oversized mobile dock '+mobile.dockHeight.toFixed(0));
    if(mobile.dockInset<4)problems.push(label+' dock not floating inside its 3D tray');
    if(mobile.dockButtonHeight<44)problems.push(label+' dock touch target below 44px');
    const menu=page.locator('#menu-toggle');
    await menu.click();
    const menuBounds=await page.locator('#mobile-menu').boundingBox();
    if(!menuBounds||menuBounds.width>310||menuBounds.height>390)problems.push(label+' oversized menu '+JSON.stringify(menuBounds));
    await menu.click();
   }
   if(!result.tools)problems.push(label+' featured tools missing');
   if(result.tickerGroups!==2)problems.push(label+' continuous tool ticker not hydrated');
   if(!result.hasKofi||!result.hasContact||!result.hasAnalytics)problems.push(label+' missing button/control');
   if(errors.length)problems.push(label+' JS error: '+errors.slice(0,2).join(' | '));
   if(name==='phone'||name==='desktop'){
    await page.screenshot({path:'qa-'+engineName+'-'+name+'.png',fullPage:true});
    await page.evaluate(()=>{location.hash='#builders'});
    await page.waitForTimeout(100);
    if(await page.locator('#builders').isHidden())problems.push(label+' Builders route failed');
   }
   console.log('PASS',label,result);
  }catch(e){problems.push(engineName+'/'+name+': '+e.message.slice(0,190))}
  finally{await context?.close()}
 }
 // Only desktop non-reduced-motion should run the CSS marquee.
 // Verify the same accessible pause control halts and resumes real animation.
 try{
  const context=await browser.newContext({viewport:{width:1440,height:900},reducedMotion:'no-preference'});
  const page=await context.newPage();
  await page.goto(origin+'/',{waitUntil:'domcontentloaded'});
  await page.locator('#eco-strip-tools .eco-ticker-group').first().waitFor();
  await page.locator('#eco-strip-tools').scrollIntoViewIfNeeded();
  await page.waitForTimeout(250);
  const tickerState=()=>page.locator('#eco-strip-tools').evaluate(node=>({
   animation:getComputedStyle(node).animationName,
   state:getComputedStyle(node).animationPlayState
  }));
  const running=await tickerState();
  if(running.animation!=='eco-ticker-move'||running.state!=='running')problems.push(engineName+'/ticker not running '+JSON.stringify(running));
  await page.locator('#eco-motion-toggle').click();
  const paused=await tickerState();
  if(paused.state!=='paused')problems.push(engineName+'/pause toggle failed '+JSON.stringify(paused));
  await page.locator('#eco-motion-toggle').click();
  const resumed=await tickerState();
  if(resumed.state!=='running')problems.push(engineName+'/resume toggle failed '+JSON.stringify(resumed));
  await context.close();
 }catch(e){problems.push(engineName+'/ticker interaction: '+e.message.slice(0,180))}
 await browser.close();
}
await new Promise(resolve=>server.close(resolve));
if(problems.length){console.error('BROWSER QA FAILED:\n'+problems.join('\n'));process.exitCode=1}
else console.log('BROWSER QA PASSED: 24 engine/viewport checks');
