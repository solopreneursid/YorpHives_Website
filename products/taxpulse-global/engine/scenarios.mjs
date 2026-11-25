import { countryCalculate } from './country.mjs';

// Preview scenarios deliberately reuse the canonical country income-tax calculation.
// No payroll, credits, currency conversion or regional tax is silently estimated.
export function compareIncomeScenarios({ country, taxYear, parameters, secondGrossSalary }) {
  if (!parameters || typeof parameters !== 'object' || Array.isArray(parameters)) {
    throw new TypeError('Expected income parameters');
  }
  if (typeof secondGrossSalary !== 'number' || !Number.isFinite(secondGrossSalary)) {
    throw new TypeError('Enter a valid second salary');
  }
  const first = countryCalculate({ country, taxYear, module: 'pit', parameters });
  const second = countryCalculate({ country, taxYear, module: 'pit',
    parameters: { ...parameters, grossSalary: secondGrossSalary } });
  const a = first.result, b = second.result;
  const grossChange = b.gross - a.gross;
  const taxChange = b.incomeTax - a.incomeTax;
  const afterIncomeTaxChange = b.netAfterIncomeTax - a.netAfterIncomeTax;
  return {
    sampleOnly: true, taxRulesVerified: false, currency: first.currency,
    country, taxYear, taxYearLabel: first.taxYearLabel,
    first, second, grossChange, taxChange, afterIncomeTaxChange,
    effectiveTaxOnChange: grossChange === 0 ? null : taxChange / grossChange,
    warnings: [...first.warnings,
      'Both examples use the same deductions and tax status. Income remaining after income tax is not take-home pay. Payroll and regional taxes may be excluded.']
  };
}
