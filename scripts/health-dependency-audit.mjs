// Read-only fail-closed npm transitive advisory assessment in an isolated CI checkout.
// Never claim a fresh resolution proves the exact deployed vendored asset versions.
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
function readJson(path){
 try{return JSON.parse(readFileSync(path,'utf8'))}
 catch(error){throw Error('Missing or invalid '+path+': '+String(error.message).slice(0,80))}
}
const pkg=readJson('package.json'),lock=readJson('package-lock.json');
assert.equal(lock.lockfileVersion>=2,true,'A versioned npm lockfile is required');
assert.equal(lock.name,pkg.name,'Lockfile must match manifest');
assert.deepEqual(lock.packages?.['']?.dependencies||{},pkg.dependencies||{},'Root npm dependency versions must match');
const entries=Object.keys(lock.packages||{}).filter(x=>x.startsWith('node_modules/'));
assert.ok(entries.length>Object.keys(pkg.dependencies||{}).length,'Resolved transitive npm graph missing');
const audit=readJson('dependency-audit-report.json');
assert.equal(audit.auditReportVersion>=2,true,'Audit response must use supported schema');
const vulnerabilities=audit.metadata?.vulnerabilities;
assert.ok(vulnerabilities&&typeof vulnerabilities==='object'&&
 ['low','moderate','high','critical'].every(k=>Number.isInteger(vulnerabilities[k])),
 'Advisory service unavailable or returned incomplete result');
const high=vulnerabilities.high||0,critical=vulnerabilities.critical||0;
console.log('RESOLVED npm audit: '+entries.length+' installed-package entries, '+high+' high, '+critical+' critical. Source: disposable CI resolution; deployed bundle not verified.');
if(high+critical>0){
 console.error('FAIL: high/critical advisory matches in freshly resolved package graph.');
 process.exitCode=1;
}
