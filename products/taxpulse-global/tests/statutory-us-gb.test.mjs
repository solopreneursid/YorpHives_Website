import test from 'node:test';
import assert from 'node:assert/strict';
import {calculateSalaryRemainder} from '../engine/taxable-income.mjs';
// IRS Publication 505 Schedule X (2026) and Publication 15.
// https://www.irs.gov/publications/p505
// https://www.irs.gov/publications/p15
// Gross 100000: taxable 83900; 5800 + .22 * 33500 = 13170.
// Gross 220000: taxable 203900; 41024 + .32 * 2125 = 41704.
for(const [pay,tax,contributions,net] of [[100000,13170,7650,79180],[220000,41704,14809,163487]])test('IRS 2026 single Texas wage '+pay,()=>{
 const r=calculateSalaryRemainder({country:'US',region:'TX',taxYear:'2026',pay,scopeConfirmed:true});
 assert.equal(r.incomeTax,tax);assert.equal(r.employeeContributions,contributions);assert.equal(r.annualRemainder,net);
});
// HMRC 2026/27: annual allowance 12570; category A monthly thresholds 1048,4189.
// https://www.gov.uk/guidance/rates-and-thresholds-for-employers-2026-to-2027
// 3000 monthly: annual tax (36000-12570)*.2=4686; NI (3000-1048)*.08*12=1873.92.
// 5000 monthly: tax 37700*.2+9730*.4=11432; NI (3141*.08+811*.02)*12=3210.
for(const [pay,tax,contributions,net] of [[3000,4686,1873.92,29440.08],[5000,11432,3210,45358]])test('HMRC 2026/27 RUK wage '+pay,()=>{
 const r=calculateSalaryRemainder({country:'GB',region:'RUK',taxYear:'2026',pay,scopeConfirmed:true});
 assert.equal(r.incomeTax,tax);assert.equal(r.employeeContributions,contributions);assert.equal(r.annualRemainder,net);
});
