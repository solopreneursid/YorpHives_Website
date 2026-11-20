import {test} from 'node:test';
import {strict as assert} from 'node:assert';
import {readFile} from 'node:fs/promises';
const read=path=>readFile(new URL('../'+path,import.meta.url),'utf8');
const section=(html,cls)=>html.split('<nav class="'+cls+'"')[1]?.split('</nav>')[0]||'';

test('header, expanded menu, and mobile dock use the same five-position order',async()=>{
 const html=await read('reimagined/index.html');
 const header=html.split('<header class="site-header"')[1]?.split('</header>')[0]||'';
 const desktop=section(html,'desktop-nav');
 const mobile=section(html,'mobile-menu');
 const dock=section(html,'mobile-dock');
 for(const nav of [desktop,mobile,dock]){
  const venture=nav.indexOf('href="#ventures"');
  const tools=nav.indexOf('href="#tools"');
  assert.ok(venture>=0&&tools>venture,'HQventures must come before Free Tools');
 }
 assert.ok(header.indexOf('href="#hqconnect"')<header.indexOf('Support us'));
 for(const nav of [mobile,dock])assert.ok(nav.indexOf('href="#hqconnect"')<nav.indexOf('Support us'));
 assert.match(header,/<button class="kofi-support" id="kofi-support" type="button" disabled>Support us<\/button>/);
 assert.match(mobile,/<button type="button" disabled>Support us<\/button>/);
 assert.match(dock,/<button type="button" disabled>[^]*?<small>Support us<\/small><\/button>/);
 for(const nav of [header,mobile,dock])assert.doesNotMatch(nav,/coming soon|payment|donate|checkout|href=[^>]*support/i);
});

test('A-Z index and every build-time tool shell preserve ordering and disabled support',async()=>{
 const [dir,shell,css,toolCss,dirCss]=await Promise.all([
  read('tools/index.html'),read('scripts/next-tool-shell.mjs'),
  read('reimagined/surfaces.css'),read('tools/tool-next.css'),read('tools/directory-next.css')
 ]);
 const nav=section(dir,'directory-nav'),dock=section(dir,'directory-dock');
 assert.ok(nav.indexOf('href="../#ventures"')<nav.indexOf('href="../#tools"'));
 assert.ok(dock.indexOf('href="../#ventures"')<dock.indexOf('href="./"'));
 assert.match(dir,/<button class="directory-support" type="button" disabled>Support us<\/button>/);
 assert.match(dock,/<button type="button" disabled>[^]*?<small>Support us<\/small><\/button>/);
 assert.match(shell, /class="tool-support" type="button" disabled>Support us/);
 assert.match(shell, /<button type="button" disabled>/);
 assert.ok(shell.indexOf("'<a href=\"../../#ventures\"")<shell.indexOf("'<a href=\"../../#tools\""));
 for(const style of [css,toolCss,dirCss]){
  assert.match(style,/grid-template-columns:repeat\(5,minmax\(0,1fr\)\)/);
  assert.match(style,/min-height:44px/);
 }
});
