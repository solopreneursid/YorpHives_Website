import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const [html,router,homeCss]=await Promise.all([
 readFile(new URL('../index.html',import.meta.url),'utf8'),
 readFile(new URL('../next.js',import.meta.url),'utf8'),
 readFile(new URL('../home-experience.css',import.meta.url),'utf8')
]);

test('the Builders page and all homepage entry points are removed',()=>{
 assert.doesNotMatch(html,/id=["']builders["']/i);
 assert.doesNotMatch(html,/href=["']#builders["']/i);
 assert.doesNotMatch(html,/data-nav=["']builders["']/i);
 assert.doesNotMatch(html,/\bBuilders\b/i);
});

test('Partnerships remains a standalone, navigable page',()=>{
 assert.match(html,/class=["']page partnership-section["'][^>]*id=["']partners["']/);
 assert.match(html,/href=["']#partners["'][^>]*data-nav=["']partners["']/);
 assert.match(html,/Partner with us/);
 assert.match(router,/partners:'Partnerships'/);
});

test('the homepage Connect section contains only contact and partnership cards',()=>{
 const section=html.slice(html.indexOf('id="home-connect"'),html.indexOf('<!-- Verified recent public updates'));
 assert.equal((section.match(/class="connection-card/g)||[]).length,2);
 assert.match(homeCss,/connection-paths\{display:grid;grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
});

test('legacy Builder routes safely return visitors to Home',()=>{
 assert.match(router,/retiredRoutes = new Set\(\['builders','post','opportunities','membership'\]\)/);
 assert.match(router,/history\.replaceState\(null,'',location\.pathname\+location\.search\+'#home'\)/);
 assert.doesNotMatch(router,/builders:'Builders'/);
});
