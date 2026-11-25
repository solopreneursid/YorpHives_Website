import {readFileSync} from 'node:fs';
const manifest=JSON.parse(readFileSync(new URL('../rules/manifest.json',import.meta.url),'utf8'));
export function assertProductionReady(m=manifest){
 if(m.schemaVersion!==1||m.releaseMode!=='production')throw Error('Production release not authorized');
 const expected=['IN','US','GB','DE','AE','CA','AU','SG'];
 for(const country of expected){const r=m.countries?.[country];if(!r||r.taxYear!=='2026'||r.verification!=='verified'||r.productionEnabled!==true||!Array.isArray(r.evidence)||r.evidence.length===0)throw Error('Unverified country: '+country)}
 return true;
}
if(process.argv.includes('--production'))assertProductionReady();
