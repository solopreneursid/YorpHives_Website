import test from 'node:test';
import assert from 'node:assert/strict';
import {calculateBudget} from '../engine/budget.mjs';
const base={currency:'INR',monthlyIncome:100000,expenses:{housing:25000,food:10000,transport:5000,utilities:3000,debt:7000,other:5000},monthlyGoal:50000,alternativeIncome:120000,alternativeHousing:35000};
test('monthly and annual cash flow, goal and alternative',()=>{
 const r=calculateBudget(base);
 assert.equal(r.monthlyExpenses,55000);assert.equal(r.monthlyBalance,45000);assert.equal(r.annualBalance,540000);assert.equal(r.goalGap,5000);assert.equal(r.savingsRate,.45);
 assert.equal(r.alternative.monthlyBalance,55000);assert.equal(r.alternative.monthlyDifference,10000);assert.equal(r.alternative.annualBalance,660000);
});
test('zero income and negative cash flow',()=>{
 const r=calculateBudget({...base,monthlyIncome:0});
 assert.equal(r.savingsRate,null);assert.equal(r.monthlyBalance,-55000);assert.equal(r.goalGap,105000);
});
test('decimal precision and bounded totals',()=>{
 const r=calculateBudget({...base,monthlyIncome:.3,expenses:{housing:.1,food:.2,transport:0,utilities:0,debt:0,other:0}});
 assert.equal(r.monthlyBalance,0);
 const max=calculateBudget({...base,monthlyIncome:1e9,expenses:Object.fromEntries(Object.keys(base.expenses).map(k=>[k,1e9]))});
 assert.equal(max.monthlyBalance,-5e9);assert.equal(max.annualBalance,-60e9);
});
test('reject malformed inputs',()=>{
 for(const patch of [{currency:'XXX'},{monthlyIncome:NaN},{monthlyIncome:-1},{monthlyIncome:.001},{alternativeHousing:Infinity},{expenses:{housing:0}},{unexpected:1}])assert.throws(()=>calculateBudget({...base,...patch}));
});
