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
     const logo=document.querySelector('#home .hero-mini-brand');
     const dock=document.querySelector('.mobile-dock');
     const dockStyle=getComputedStyle(dock);
     const dockBox=dock.getBoundingClientRect();
     const dockContentLeft=dockBox.left+parseFloat(dockStyle.paddingLeft);
     const dockContentRight=dockBox.right-parseFloat(dockStyle.paddingRight);
     const dockButtons=[...dock.querySelectorAll(':scope > a,:scope > button')].map(n=>{
      const b=n.getBoundingClientRect();
      return {left:b.left,right:b.right,width:b.width};
     });
     const artBox=art.getBoundingClientRect();
     const heading=document.querySelector('#home-title');
     const headingBox=heading.getBoundingClientRect();
     const headingLineHeight=parseFloat(getComputedStyle(heading).lineHeight);
     const headingLineCount=Math.round(headingBox.height/headingLineHeight);
     const introBox=document.querySelector('#home .hero-intro').getBoundingClientRect();
     const introFont=parseFloat(getComputedStyle(document.querySelector('#home .hero-intro')).fontSize);
     const buttons=[...document.querySelectorAll('#home .hero-ctas .button')].map(n=>n.getBoundingClientRect());
     const heroBottom=document.querySelector('#home .hero-bottom');
     const bottomStatus=heroBottom.querySelector(':scope > span');
     const bottomLink=heroBottom.querySelector('a');
     const footerCaptionsDoNotWrap=getComputedStyle(bottomStatus).whiteSpace==='nowrap' &&
      getComputedStyle(bottomLink).whiteSpace==='nowrap';
     const cards=[...art.querySelectorAll('.art-node')];
     const cardBoxes=cards.map(n=>n.getBoundingClientRect());
     const labels=cards.map(n=>n.querySelector('strong')?.textContent.trim());
     return {
      heroHeight:hero.getBoundingClientRect().height,
      artVisible:getComputedStyle(art).display!=='none',
      artHeight:artBox.height,
      artAspect:artBox.width/artBox.height,
      headingArtTopDelta:Math.abs(headingBox.top-artBox.top),
      researchPosition:(cardBoxes[0].top-artBox.top)/artBox.height,
      evaluatePosition:(cardBoxes[1].top-artBox.top)/artBox.height,
      founderBottomGap:(artBox.bottom-cardBoxes[2].bottom)/artBox.height,
      orbitBesideHeading:headingBox.right<=artBox.left+2 &&
       artBox.top<headingBox.bottom && artBox.bottom>headingBox.top,
      introUnderHeading:introBox.top>=headingBox.bottom-2 &&
       Math.abs(introBox.left-headingBox.left)<=2,
      introBesideOrbit:introBox.right<=artBox.left+2 &&
       introBox.top<artBox.bottom-10,
      introFont,
      footerCaptionsDoNotWrap,
      ctasSideBySide:buttons.length===2 &&
       Math.abs(buttons[0].top-buttons[1].top)<2 &&
       buttons[0].right<=buttons[1].left+2,
      ctasStacked:buttons.length===2 &&
       buttons[1].top>=buttons[0].bottom-1,
      buttonsUnderComposition:buttons.length===2 &&
       buttons[0].top>=Math.max(artBox.bottom,introBox.bottom)-2,
      headingFont:parseFloat(getComputedStyle(heading).fontSize),
      headingLineCount,
      cardFont:parseFloat(getComputedStyle(cards[0].querySelector('strong')).fontSize),
      cardsVisible:cards.length===3&&cards.every(n=>getComputedStyle(n).display!=='none'),
      cardsWithinOrbit:cards.every(n=>{
       const b=n.getBoundingClientRect();
       return b.left>=artBox.left-1&&b.right<=artBox.right+1&&b.top>=artBox.top-1&&b.bottom<=artBox.bottom+1;
      }),
      labels,
      miniHidden:getComputedStyle(logo).display==='none',
      dockHeight:dockBox.height,
      dockInset:dockBox.left,
      dockButtonHeight:dock.querySelector('a').getBoundingClientRect().height,
      dockColumns:dockStyle.gridTemplateColumns.trim().split(/\s+/).length,
      dockButtonCount:dockButtons.length,
      dockWidths:dockButtons.map(b=>b.width),
      dockLeftGap:dockButtons[0].left-dockContentLeft,
      dockRightGap:dockContentRight-dockButtons.at(-1).right
     };
    });
    // Mobile now uses the same original floating-card orbit as desktop.
    if(!mobile.artVisible)problems.push(label+' desktop-style orbit hidden on phone');
    if(!mobile.cardsVisible||!mobile.cardsWithinOrbit)problems.push(label+' floating process boxes missing or clipped');
    if(mobile.labels.join('|')!=='Spot the signal|Test the idea|Decide & create')
     problems.push(label+' orbital process labels changed '+mobile.labels.join('|'));
    if(!mobile.miniHidden)problems.push(label+' duplicate mini-brand beside original orbit');
    if(!mobile.orbitBesideHeading)problems.push(label+' orbit must sit BESIDE the headline, not below');
    if(mobile.headingArtTopDelta>8)problems.push(label+' headline and orbit top edges are misaligned '+mobile.headingArtTopDelta.toFixed(0)+'px');
    if(!mobile.introUnderHeading||!mobile.introBesideOrbit)
     problems.push(label+' description must sit immediately UNDER headline and BESIDE artwork');
    if(!mobile.buttonsUnderComposition)problems.push(label+' hero buttons overlap headline or artwork');
    if(!mobile.footerCaptionsDoNotWrap)problems.push(label+' desktop-style hero closing captions wrap on phone');
    if(width>=360&&!mobile.ctasSideBySide)problems.push(label+' desktop-like paired buttons not side by side');
    if(width<360&&!mobile.ctasStacked)problems.push(label+' narrow-phone buttons should stack without clipping');
    if(mobile.headingFont<20||mobile.cardFont<7.5||mobile.introFont<11)
     problems.push(label+' hero headline, description or card text too small');
    if(mobile.headingLineCount!==3)problems.push(label+' headline must retain desktop three-line composition, got '+mobile.headingLineCount);
    if(mobile.artAspect<.95||mobile.artAspect>1.15)
     problems.push(label+' mobile orbit aspect ratio outside proportion '+mobile.artAspect.toFixed(2));
    if(mobile.researchPosition<.04||mobile.researchPosition>.18)problems.push(label+' research card no longer near orbit top');
    if(mobile.evaluatePosition<.23||mobile.evaluatePosition>.42)problems.push(label+' intelligence card no longer near orbit middle');
    if(mobile.founderBottomGap<.04||mobile.founderBottomGap>.18)problems.push(label+' founder card no longer near orbit bottom');
    // The fuller orbit legitimately extends the first screen; it must not grow without bounds.
    if(mobile.heroHeight>height+120)
     problems.push(label+' excessive mobile hero height '+mobile.heroHeight.toFixed(0)+'/'+height);
    if(mobile.dockHeight>60)problems.push(label+' oversized mobile dock '+mobile.dockHeight.toFixed(0));
    if(mobile.dockInset<4)problems.push(label+' dock not floating inside its 3D tray');
    if(mobile.dockButtonHeight<44)problems.push(label+' dock touch target below 44px');
    if(mobile.dockColumns!==4||mobile.dockButtonCount!==4)
     problems.push(label+' bottom navigation must use four equal columns for four buttons');
    if(mobile.dockWidths.some(w=>Math.abs(w-mobile.dockWidths[0])>1.5))
     problems.push(label+' bottom navigation buttons are not evenly sized '+mobile.dockWidths.join('/'));
    if(Math.abs(mobile.dockLeftGap)>2||Math.abs(mobile.dockRightGap)>2)
     problems.push(label+' bottom navigation has unused side space '+mobile.dockLeftGap.toFixed(1)+'/'+mobile.dockRightGap.toFixed(1)+'px');
    const menu=page.locator('#menu-toggle');
    await menu.click();
    const menuBounds=await page.locator('#mobile-menu').boundingBox();
    if(!menuBounds||menuBounds.width>310||menuBounds.height>390)problems.push(label+' oversized menu '+JSON.stringify(menuBounds));
    await menu.click();
   }
   if(width<=430){
    const footer=await page.locator('footer.footer').evaluate(node=>{
     const bounds=node.getBoundingClientRect();
     return {height:bounds.height,links:node.querySelectorAll('a[href]').length,
      analyticsVisible:!!node.querySelector('#anonymous-analytics-toggle') &&
       getComputedStyle(node.querySelector('#anonymous-analytics-toggle')).display!=='none'};
    });
    if(footer.height>310)problems.push(label+' mobile footer too tall '+footer.height.toFixed(0));
    if(footer.links<8)problems.push(label+' footer links missing '+footer.links);
    if(!footer.analyticsVisible)problems.push(label+' footer privacy toggle hidden');
   }
   if(!result.tools)problems.push(label+' featured tools missing');
   if(result.tickerGroups!==2)problems.push(label+' continuous tool ticker not hydrated');
   if(!result.hasKofi||!result.hasContact||!result.hasAnalytics)problems.push(label+' missing button/control');
   if(errors.length)problems.push(label+' JS error: '+errors.slice(0,2).join(' | '));
   if(name==='phone'||name==='desktop'){
    await page.screenshot({path:'qa-'+engineName+'-'+name+'.png',fullPage:true});
    await page.evaluate(()=>{location.hash='#builders'});
    await page.waitForFunction(()=>location.hash==='#home',null,{timeout:3000}).catch(()=>{});
    const activeHash=await page.evaluate(()=>location.hash);
    if(activeHash!=='#home'||await page.locator('#home').isHidden())
     problems.push(label+' retired Builders hash did not return to Home');
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
