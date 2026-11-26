import {writeFile,rename} from 'node:fs/promises';
const ids=['IND','USA','GBR','CAN','AUS','DEU','SGP','ARE'];
const year=Number(process.argv[2]),target=process.argv[3];
if(!Number.isInteger(year)||year<1990||year>new Date().getUTCFullYear()||!target)throw Error('Usage: node scripts/fetch-reference-ppp.mjs YEAR OUTPUT.json');
const endpoint='https://api.worldbank.org/v2/country/'+ids.join(';')+'/indicator/PA.NUS.PRVT.PP?date='+year+'&format=json&per_page=100';
const response=await fetch(endpoint,{signal:AbortSignal.timeout(20000),redirect:'error'});
if(!response.ok)throw Error('World Bank API status '+response.status);
const body=await response.text();if(body.length>1000000)throw Error('Oversized reference response');
const payload=JSON.parse(body);
if(!Array.isArray(payload)||!Array.isArray(payload[1]))throw Error('Invalid World Bank response');
const values={};for(const row of payload[1]){
 if(!ids.includes(row.countryiso3code)||row.date!==String(year)||row.indicator?.id!=='PA.NUS.PRVT.PP')continue;
 if(Object.hasOwn(values,row.countryiso3code))throw Error('Duplicate observation');
 if(typeof row.value!=='number'||!Number.isFinite(row.value)||row.value<=0)continue;
 values[row.countryiso3code]=row.value;
}
if(ids.some(id=>!Object.hasOwn(values,id)))throw Error('Incomplete same-year observations; retain previous snapshot or manual inputs');
const snapshot={schemaVersion:1,source:'https://data.worldbank.org/indicator/PA.NUS.PRVT.PP',license:'CC BY 4.0',referenceYear:year,retrievedAt:new Date().toISOString(),reviewStatus:'pending',values};
await writeFile(target+'.tmp',JSON.stringify(snapshot,null,2)+'\n',{flag:'wx'});await rename(target+'.tmp',target);
console.log('Saved pending-review reference snapshot; not automatically activated.');
