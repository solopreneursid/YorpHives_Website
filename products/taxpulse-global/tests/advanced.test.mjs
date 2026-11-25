import test from 'node:test';import assert from 'node:assert/strict';import {advancedCalculate as calc,supported} from '../engine/advanced.mjs';
const call=(module,parameters)=>calc({module,parameters}).result;
test('salary growth',()=>{const r=call('salary_hike',{currentSalary:100,newSalary:120,annualGrowthRate:.1,years:2});assert.equal(r.absoluteIncrease,20);assert.ok(Math.abs(r.projection[2].salary-145.2)<1e-8)});
test('savings zero growth',()=>{const r=call('fire_wealth',{initialSavings:1000,monthlyContribution:100,annualReturn:0,years:1,annualSpending:80,withdrawalRate:.04});assert.equal(r.projectedBalance,2200);assert.equal(r.reachedMonth,10)});
test('FX fees',()=>assert.equal(call('fx_payout',{amount:100,options:[{fixedFee:5,percentFee:.05,exchangeRate:2}]}).options[0].recipientAmount,180));
test('team budget',()=>assert.equal(call('team_planner',{roles:[{headcount:2,annualSalary:10000,annualEmployerCosts:1000,monthlyServiceFee:100,reportingCurrencyRate:1}]}).annualCost,24400));
test('cost plus',()=>assert.ok(Math.abs(call('transfer_pricing',{cost:100,markup:.155}).invoiceAmount-115.5)<1e-8));
test('quarterly allocation',()=>assert.equal(call('quarterly_tax',{annualEstimatedTax:1000,alreadyPaid:400,remainingQuarters:2}).perQuarter,300));
test('validation',()=>{assert.equal(supported.length,6);assert.throws(()=>call('salary_hike',{currentSalary:-1,newSalary:100,annualGrowthRate:0}));assert.throws(()=>call('fx_payout',{amount:1,options:[{fixedFee:2,exchangeRate:1}]}));assert.throws(()=>call('quarterly_tax',{annualEstimatedTax:100,remainingQuarters:0}));assert.throws(()=>call('constructor',{}))});
