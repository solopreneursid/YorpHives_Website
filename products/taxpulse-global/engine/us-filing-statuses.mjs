// Narrow 2026 US federal ordinary-income presets from IRS Rev. Proc. 2025-32.
// They exclude credits, itemized deductions, AMT, state tax, and other eligibility rules.
// Do not equate verified bracket parameters with a verified tax return.
const RATES = [0.10, 0.12, 0.22, 0.24, 0.32, 0.35, 0.37];

function preset(standardDeduction, limits) {
  const brackets = RATES.map((rate, index) => Object.freeze({
    min: index === 0 ? 0 : limits[index - 1],
    max: index === limits.length ? null : limits[index],
    rate
  }));
  return Object.freeze({
    standard_deduction: standardDeduction,
    brackets: Object.freeze(brackets),
    source: 'https://www.irs.gov/irb/2025-45_IRB'
  });
}

// 'single' deliberately uses the preserved original US JSON fixture instead.
export const US_FILING_OVERRIDES = Object.freeze({
  mfj: preset(32200, [24800, 100800, 211400, 403550, 512450, 768700]),
  hoh: preset(24150, [17700, 67450, 105700, 201750, 256200, 640600]),
  mfs: preset(16100, [12400, 50400, 105700, 201775, 256225, 384350])
});
