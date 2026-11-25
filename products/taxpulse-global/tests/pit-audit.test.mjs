import test from 'node:test';
import assert from 'node:assert/strict';
import { countryCalculate } from '../engine/country.mjs';

const near = (actual, expected) => assert.ok(Math.abs(actual - expected) < 0.005,
  'expected ' + expected + ' but got ' + actual);
const calc = (country, grossSalary, options = {}) => countryCalculate({
  country, taxYear: '2026', module: 'pit', parameters: { grossSalary, ...options }
});

test('PIT audit trail reconciles allowances, bracket tax, rebates and cess', () => {
  for (const [country, income, options] of [
    ['US', 300000, { filingStatus: 'mfj', preTaxDeductions: 20000 }],
    ['US', 120000, { filingStatus: 'hoh' }],
    ['GB', 110000, {}],
    ['IN', 1285000, { residentIndividual: true }],
    ['IN', 1285000, { residentIndividual: false }]
  ]) {
    const r = calc(country, income, options);
    const x = r.result;
    near(x.taxableIncome, Math.max(0, income - (options.preTaxDeductions || 0) - x.standardDeductionApplied));
    near(x.taxBeforeRebate, x.brackets.reduce((sum, tier) => sum + tier.taxInTier, 0));
    near(x.taxableIncome, x.brackets.reduce((sum, tier) => sum + tier.taxableInTier, 0));
    near(x.cessAmount, (x.taxBeforeRebate - x.rebateApplied) * x.cessRate);
    near(x.incomeTax, x.taxBeforeRebate - x.rebateApplied + x.cessAmount);
    near(x.netAfterIncomeTax, Math.max(0, income - (options.preTaxDeductions || 0) - x.incomeTax));
    near(x.effectiveIncomeTaxRate, income ? x.incomeTax / income : 0);
    assert.equal(r.taxRulesVerified, false);
    assert.equal(r.sampleOnly, true);
  }
});

test('UK personal allowance tapers as adjusted earnings increase', () => {
  const a = calc('GB', 100000).result;
  const b = calc('GB', 110000).result;
  const c = calc('GB', 125140).result;
  near(a.standardDeductionApplied, 12570);
  near(b.standardDeductionApplied, 7570);
  near(c.standardDeductionApplied, 0);
});

test('India 2026 resident marginal relief matches Income Tax Department FY 2026-27 examples', () => {
  // Source: https://www.incometaxindia.gov.in/documents/20117/15766092/FAQs-Budget-2026.pdf
  // Source examples are before 4% health and education cess.
  const rows = [
    { taxable: 1200000, raw: 60000, relief: 60000, baseTax: 0 },
    { taxable: 1210000, raw: 61500, relief: 51500, baseTax: 10000 },
    { taxable: 1225000, raw: 63750, relief: 38750, baseTax: 25000 },
    { taxable: 1250000, raw: 67500, relief: 17500, baseTax: 50000 },
    { taxable: 1270000, raw: 70500, relief: 500, baseTax: 70000 },
    { taxable: 1270588, raw: 70588.2, relief: 0.2, baseTax: 70588 }
  ];
  for (const row of rows) {
    const r = calc('IN', row.taxable + 75000, { residentIndividual: true }).result;
    near(r.taxBeforeRebate, row.raw);
    near(r.rebateApplied, row.relief);
    near(r.incomeTax, row.baseTax * 1.04);
    near(r.marginalReliefApplied, row.taxable > 1200000 ? row.relief : 0);
  }
});

test('India residency must be explicit and controls eligibility', () => {
  assert.throws(() => calc('IN', 1285000), /boolean/);
  assert.throws(() => calc('IN', 1285000, { residentIndividual: 'true' }), /boolean/);
  assert.throws(() => calc('US', 120000, { residentIndividual: true }), /only supported for India/);
  const resident = calc('IN', 1285000, { residentIndividual: true }).result;
  const nonresident = calc('IN', 1285000, { residentIndividual: false }).result;
  assert.equal(resident.residentIndividual, true);
  assert.equal(nonresident.residentIndividual, false);
  near(resident.incomeTax, 10400);
  near(nonresident.incomeTax, 63960);
  assert.ok(nonresident.incomeTax > resident.incomeTax);
  assert.equal(nonresident.rebateApplied, 0);
});
