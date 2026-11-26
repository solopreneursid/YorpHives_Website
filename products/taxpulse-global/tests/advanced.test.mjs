import test from 'node:test';import assert from 'node:assert/strict';import {advancedCalculate as calc,supported} from '../engine/advanced.mjs';
const call=(module,parameters)=>calc({module,parameters}).result;
test('salary growth',()=>{const r=call('salary_hike',{currentSalary:100,newSalary:120,annualGrowthRate:.1,years:2});assert.equal(r.absoluteIncrease,20);assert.ok(Math.abs(r.projection[2].salary-145.2)<1e-8)});
test('savings zero growth',()=>{const r=call('fire_wealth',{initialSavings:1000,monthlyContribution:100,annualReturn:0,years:1,annualSpending:80,withdrawalRate:.04});assert.equal(r.projectedBalance,2200);assert.equal(r.reachedMonth,10)});
test('FX fees',()=>assert.equal(call('fx_payout',{amount:100,options:[{fixedFee:5,percentFee:.05,exchangeRate:2}]}).options[0].recipientAmount,180));
test('team budget',()=>assert.equal(call('team_planner',{roles:[{headcount:2,annualSalary:10000,annualEmployerCosts:1000,monthlyServiceFee:100,reportingCurrencyRate:1}]}).annualCost,24400));
test('cost plus',()=>assert.ok(Math.abs(call('transfer_pricing',{cost:100,markup:.155}).invoiceAmount-115.5)<1e-8));
test('quarterly allocation',()=>assert.equal(call('quarterly_tax',{annualEstimatedTax:1000,alreadyPaid:400,remainingQuarters:2}).perQuarter,300));
test('validation',()=>{assert.equal(supported.length,20);assert.throws(()=>call('salary_hike',{currentSalary:-1,newSalary:100,annualGrowthRate:0}));assert.throws(()=>call('fx_payout',{amount:1,options:[{fixedFee:2,exchangeRate:1}]}));assert.throws(()=>call('quarterly_tax',{annualEstimatedTax:100,remainingQuarters:0}));assert.throws(()=>call('constructor',{}))});

test('equity and cash bonus',()=>assert.equal(call('equity_bonus',{salary:1000,cashBonus:100,vestedUnits:10,marketPrice:20,strikePrice:5,assumedTaxRate:.2}).estimatedNetAdditional,200));
test('contractor comparison',()=>assert.equal(call('contractor_eor',{contractRevenue:1000,contractExpenses:100,employeeSalary:800,employeeDeductions:100,assumedContractorTaxRate:.2}).contractorNet,720));
test('exit benefit scenario',()=>assert.equal(call('gratuity_exit',{monthlyBasePay:2600,serviceYears:5,assumedBenefitDaysPerYear:15,monthlyDayDivisor:26,unusedLeaveDays:2}).grossSettlement,7700));
test('freelancer billing',()=>assert.ok(Math.abs(call('freelancer_billing',{subtotal:100,assumedIndirectTaxRate:.18,assumedWithholdingRate:.1}).expectedReceipt-108)<1e-8));
test('freelancer ledger',()=>assert.equal(call('freelancer_ledger',{entries:[{type:'revenue',amount:1000},{type:'expense',amount:200},{type:'withholding',amount:50}],assumedTaxRate:.2}).remainingEstimatedTax,110));
test('residency threshold is not a legal determination',()=>{const r=call('residency_payslip',{daysPresent:183,assumedDayThreshold:183,grossPay:1000,totalDeductions:100});assert.equal(r.thresholdReached,true);assert.equal(r.legalResidencyDetermined,false);assert.equal(r.netPay,900)});
test('salary budget balances',()=>{const r=call('ctc_restructurer',{totalAnnualBudget:100000,basicSalaryShare:.5,assumedEmployerContributionRate:.12,otherEmployerCosts:4000});assert.ok(Math.abs(r.totalCost-100000)<1e-8)});
test('advanced invalid inputs',()=>{assert.throws(()=>call('freelancer_ledger',{entries:[{type:'__proto__',amount:1}],assumedTaxRate:0}));assert.throws(()=>call('residency_payslip',{daysPresent:367,assumedDayThreshold:183,grossPay:1,totalDeductions:0}));assert.throws(()=>call('ctc_restructurer',{totalAnnualBudget:100,basicSalaryShare:.5,assumedEmployerContributionRate:.1,otherEmployerCosts:101}))});

test('numeric CSV payroll',()=>assert.equal(call('bulk_csv',{csv:'gross,deductions,employerCosts\n100,20,10\n200,40,20'}).totalNet,240));
test('reject CSV formulas and identifiers',()=>assert.throws(()=>call('bulk_csv',{csv:'gross,deductions,employerCosts\n=1,0,0'})));
test('deduction tracker',()=>assert.equal(call('tax_vault',{categories:[{paid:200,assumedLimit:150}]}).totalWithinAssumedLimits,150));
test('unsigned payslip math',()=>{const r=call('payroll_hra_generator',{monthlyGross:3000,workingDays:30,unpaidDays:2,deductions:100});assert.equal(r.netPay,2700);assert.equal(r.officialDocument,false)});
test('accountant summary',()=>assert.equal(call('ca_handoff',{grossIncome:1000,expenses:200,withholding:50,taxPayments:20,estimatedTax:100}).outstanding,30));
test('PE checklist not legal determination',()=>{const r=call('pe_risk',{fixedPlace:true,contractAuthority:false,localEmployees:false,longDuration:false,dependentAgent:false});assert.deepEqual(r.flagged,['fixedPlace']);assert.equal(r.legalDetermination,false)});
test('expat scenario',()=>assert.equal(call('expat_nomad',{annualIncome:1000,assumedHomeTaxRate:.1,assumedHostTaxRate:.2,assumedRelief:100,annualLivingCosts:300}).remainingAfterTaxAndLiving,500));
test('offer budget',()=>{const r=call('agent_deal_desk',{employerBudget:1200,fixedEmployerCosts:100,assumedEmployerCostRate:.1,assumedEmployeeDeductionRate:.2,targetNet:900});assert.ok(Math.abs(r.maxNet-800)<1e-8);assert.equal(r.feasible,false)});
