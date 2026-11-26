import test from 'node:test';
import assert from 'node:assert/strict';
import {indiaCtc,purchasingPower,relocationBreakEven,indiaDeductionScenario} from '../engine/decision-tools.mjs';
const ctc={annualCtc:1800000,employerContributions:100000,nonCashBenefits:200000,employeeContributions:21600,otherPayrollDeductions:2500,residentIndividual:true,ageGroup:'under-60',oldEligibleDeductions:0,newEligibleDeductions:0};
test('CTC cash component and tax reconciliation',()=>{
 const r=indiaCtc(ctc);assert.equal(r.annualGross,1500000);assert.equal(r.new.incomeTax,97500);assert.equal(r.new.annualCash,1378400);assert.equal(r.taxRulesVerified,false);
 assert.throws(()=>indiaCtc({...ctc,employerContributions:2000000}));assert.throws(()=>indiaCtc({...ctc,employeeContributions:-1}));assert.throws(()=>indiaCtc({...ctc,extra:1}));
});
test('national purchasing power is not nominal currency conversion',()=>{
 const x={firstCurrency:'INR',secondCurrency:'USD',firstMonthlyIncome:20000,secondMonthlyIncome:1200,firstFactor:20,secondFactor:1,referenceYear:2024};const r=purchasingPower(x);assert.equal(r.firstInternationalDollars,1000);assert.equal(r.difference,200);assert.throws(()=>purchasingPower({...x,firstFactor:0}));assert.throws(()=>purchasingPower({...x,referenceYear:2027}));assert.throws(()=>purchasingPower({...x,secondCurrency:'INR'}));
});
test('relocation break-even, negative savings and unreachable targets',()=>{
 const x={currency:'INR',currentMonthlySavings:50000,destinationMonthlySavings:70000,movingCost:110000};const r=relocationBreakEven(x);assert.equal(r.monthsToRecover,6);assert.equal(r.firstYearDifference,130000);assert.equal(relocationBreakEven({...x,destinationMonthlySavings:-1000}).monthsToRecover,null);assert.equal(relocationBreakEven({...x,movingCost:0}).monthsToRecover,0);
});
test('deductions comparison is independently computed under both regimes',()=>{
 const x={grossSalary:1500000,residentIndividual:true,ageGroup:'under-60',oldEligibleDeductions:0,newEligibleDeductions:0,extraOldEligibleDeductions:100000,extraNewEligibleDeductions:0};const r=indiaDeductionScenario(x);assert.ok(r.oldTaxReduction>0);assert.equal(r.newTaxReduction,0);assert.equal(r.taxRulesVerified,false);assert.throws(()=>indiaDeductionScenario({...x,extraOldEligibleDeductions:-1}));
});
