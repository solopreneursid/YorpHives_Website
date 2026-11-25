import test from 'node:test';
import assert from 'node:assert/strict';
import { countryCalculate } from '../engine/country.mjs';

// Expected results were calculated separately from the canonical bracket fixtures.
// Scope is deliberately narrow; these vectors do not verify entire country modules.
const CASES = [
  ['US', 0, 0],
  ['US', 16100, 0],       // 2026 single-filer standard deduction
  ['US', 28500, 1240],    // end of 10% taxable band
  ['US', 66500, 5800],    // end of 12% taxable band
  ['US', 100000, 13170],  // 2026 single-filer federal ordinary income tax
  ['US', 121800, 17966],  // end of 22% taxable band
  ['GB', 12570, 0],       // 2026/27 personal allowance
  ['GB', 50270, 7540],    // end of basic-rate taxable band
  ['GB', 100000, 27432],  // personal allowance taper begins
  ['GB', 110000, 33432],  // 60% effective marginal zone
  ['GB', 125140, 42516],  // allowance fully tapered
  ['GB', 130000, 44703]   // additional rate applies above 125,140
];

for (const [country, grossSalary, expected] of CASES) {
  test('official 2026 income tax boundary ' + country + ' ' + grossSalary, () => {
    const response = countryCalculate({
      country, taxYear: '2026', module: 'pit', parameters: { grossSalary }
    });
    assert.ok(Math.abs(response.result.incomeTax - expected) < 0.005);
    assert.equal(response.taxRulesVerified, false);
    assert.equal(response.sampleOnly, true);
  });
}

test('ordinary-income tax is monotonic near checked US and UK thresholds', () => {
  for (const [country, threshold] of [
    ['US', 28500], ['US', 66500], ['US', 121800],
    ['GB', 50270], ['GB', 100000], ['GB', 125140]
  ]) {
    const calculate = grossSalary => countryCalculate({
      country, taxYear: '2026', module: 'pit', parameters: { grossSalary }
    }).result.incomeTax;
    assert.ok(calculate(threshold - 1) <= calculate(threshold),
      country + ' tax decreases at ' + threshold);
    assert.ok(calculate(threshold) <= calculate(threshold + 1),
      country + ' tax decreases after ' + threshold);
  }
});
