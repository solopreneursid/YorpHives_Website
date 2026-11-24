import {chromium} from 'playwright';
import AxeBuilder from '@axe-core/playwright';
const browser=await chromium.launch({headless:true});
try {
 for(const width of [390,1280]) {
  const context=await browser.newContext({viewport:{width,height:820},reducedMotion:'reduce',colorScheme:'light'});
  const page=await context.newPage();
  await page.goto('http://127.0.0.1:4173/hqventures/',{waitUntil:'networkidle'});
  const result=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa']).analyze();
  console.log('DIAGNOSTIC '+width+' '+JSON.stringify(result.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>({target:n.target,html:n.html,summary:n.failureSummary,checks:n.any.map(a=>a.data)}))}))));
  await context.close();
 }
} finally {await browser.close()}
