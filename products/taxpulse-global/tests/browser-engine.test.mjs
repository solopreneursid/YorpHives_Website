import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {execFileSync} from 'node:child_process';import vm from 'node:vm';import {advancedCalculate,supported} from '../engine/advanced.mjs';
test('browser engine uses identical implementation to backend',()=>{execFileSync(process.execPath,[new URL('../staging/integrated/build.mjs',import.meta.url).pathname]);const ctx=vm.createContext({});vm.runInContext(readFileSync(new URL('../staging/integrated/bundle/advanced-browser.js.txt',import.meta.url),'utf8'),ctx);assert.equal(ctx.TaxPulseAdvanced.supported.length,supported.length);for(const payload of [{module:'salary_hike',parameters:{currentSalary:100,newSalary:120,annualGrowthRate:0,years:5}},{module:'fire_wealth',parameters:{initialSavings:0,monthlyContribution:100,annualReturn:0,years:10,withdrawalRate:.04,annualSpending:10000}}])assert.deepEqual(JSON.parse(JSON.stringify(ctx.TaxPulseAdvanced.calculate(payload))),advancedCalculate(payload));const app=readFileSync(new URL('../staging/integrated/application.js',import.meta.url),'utf8');assert.match(app,/hikeScenario\.projection/);assert.match(app,/full\.reachedMonth === null/);assert.ok(!app.includes('yrsToFire += 0.25'));const html=readFileSync(new URL('../staging/integrated/index.html',import.meta.url),'utf8');assert.ok(html.indexOf('/assets/advanced-browser.js')<html.indexOf('/assets/application.js'))});

test('additional frontend modules invoke the shared engine and avoid false certifications',()=>{
 const app=readFileSync(new URL('../staging/integrated/application.js',import.meta.url),'utf8');
 for(const name of ['team_planner','transfer_pricing','fx_payout','pe_risk','payroll_hra_generator'])assert.ok(app.includes("module:'"+name+"'"),name);
 assert.ok(!app.includes('[Signed: ${landlordName}]'));
 assert.ok(!app.includes('Local Entity cheaper than EOR at >= 4 staff'));
 assert.ok(app.includes('UNSIGNED RENT PLANNING SUMMARY'));
 assert.ok(app.includes('No score can establish a safe harbor'));
 new vm.Script(app);
});
