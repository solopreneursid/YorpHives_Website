import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PUBLIC_LOCALES,checkCatalogTranslation,makeCatalogLocaleCopy,catalogTranslationReport} from '../catalog-localization.mjs';
const read=path=>readFile(new URL('../'+path,import.meta.url),'utf8');
const reviewed=()=>{
 const localizations={};
 for(const lang of PUBLIC_LOCALES)localizations[lang]={
  name:'Translated venture '+lang,description:'Description for this approved launch in '+lang,
  reviewed:true,reviewedOn:'2026-11-18'
 };
 return {name:'New approved venture',description:'A new launched product added to the studio catalog.',
  type:'app',url:'apps/new-venture/',localizations};
};
test('all seven target languages are required for newly published products',()=>{
 const venture=reviewed();
 assert.deepEqual(checkCatalogTranslation(venture),[]);
 const map=makeCatalogLocaleCopy([venture]);
 for(const lang of PUBLIC_LOCALES){
  assert.equal(map[venture.name][lang],venture.localizations[lang].name);
  assert.equal(map[venture.description][lang],venture.localizations[lang].description);
 }
 delete venture.localizations.es;
 assert.match(checkCatalogTranslation(venture).join(' '),/es/);
 assert.equal(Object.keys(makeCatalogLocaleCopy([venture])).length,0,
  'Partially approved content must never enter the generated translation map');
});
test('unreviewed or unsafe translations cannot be advertised as complete',()=>{
 const item=reviewed();
 item.localizations.hi.reviewed=false;
 item.localizations.fr.description='<script>alert(1)</script>';
 assert.match(checkCatalogTranslation(item).join(' '),/hi.*review/);
 assert.match(checkCatalogTranslation(item).join(' '),/fr/);
});
test('legacy tools remain usable and future products appear on localization worklist',async()=>{
 const catalog=JSON.parse(await read('catalog.json'));
 const baseline=JSON.parse(await read('catalog-localization-baseline.json'));
 assert.equal(baseline.legacyUrls.length,143);
 const original=new Set(baseline.legacyUrls);
 assert.ok(catalog.items.every(x=>original.has(x.url)));
 const future=reviewed();
 delete future.localizations.ja;
 const report=catalogTranslationReport([...catalog.items,future],{legacyUrls:baseline.legacyUrls});
 assert.equal(report.pending.find(x=>x.url===future.url).legacy,false);
 assert.match(report.pending.find(x=>x.url===future.url).missing.join(' '),/ja/);
 const build=await read('scripts/build-site.mjs');
 assert.match(build,/New public catalog entry lacks reviewed localization/);
 assert.match(build,/makeCatalogLocaleCopy\(published\)/);
 assert.match(build,/site-catalog-copy\.mjs/);
 assert.match(build,/i18n-coverage\.json/);
});
test('compiled release creates a safe, first-party catalog locale map and pending report',async()=>{
 const fs=await import('node:fs/promises');
 const base=new URL('../dist/',import.meta.url);
 const map=await fs.readFile(new URL('site-catalog-copy.mjs',base),'utf8');
 const report=JSON.parse(await fs.readFile(new URL('i18n-coverage.json',base),'utf8'));
 assert.match(map,/export const CATALOG_COPY=/);
 assert.equal(report.schemaVersion,1);
 assert.equal(report.pending.length>=143,true);
 assert.equal(report.pending.every(x=>x.legacy),true);
 assert.equal(report.ready.length,0);
});
