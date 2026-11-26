# Statutory review — 2026-11-25

Status: preliminary source review, not independent professional approval. Production flags remain disabled.

## United States — scoped Texas salary
Sources: https://www.irs.gov/publications/p505 (2026 Schedule X), https://www.irs.gov/publications/p15 (2026 employment taxes), https://www.irs.gov/newsroom/working-families-tax-cuts-individuals-and-workers (2026 standard deduction).
Compared: single standard deduction 16,100; ordinary federal brackets; employee Social Security 6.2% up to 184,500; Medicare 1.45%; additional Medicare 0.9% above 200,000 for the scoped single filer.
Reference cases in tests/statutory-us-gb.test.mjs are manually derived from official schedules, not copied from engine output. Execution pending.
Open: AMT, credits, additional deductions (including qualified tips and overtime), state source verification, withholding vs annual liability, other filing statuses and non-salary modules. Legacy US sales-tax averages and pass-through approximations are not approved.

## United Kingdom — scoped ordinary salary
Sources: https://www.gov.uk/guidance/rates-and-thresholds-for-employers-2026-to-2027 and https://www.gov.uk/government/publications/rates-and-allowances-income-tax/income-tax-rates-and-allowances-current-and-past.
Compared: standard allowance 12,570, taper above 100,000, rest-of-UK bands, category A monthly primary threshold 1,048 and upper earnings limit 4,189; employee rates 8% and 2%. Scottish official taxable thresholds 3,967 / 16,956 / 31,092 / 62,430 / 125,140 require separate boundary review.
Reference cases: same test file, execution pending.
Open: statutory rounding and PAYE, Scottish reference cases, non-salary modules. Legacy UK capital-gains short/long-term labels require correction: the ordinary 18%/24% rates depend on income band, not a 12-month holding period. Do not activate legacy module on this evidence.

## Release status
IN, CA, AU, DE, SG, AE: statutory review pending.
No country/module approved. No production authorization or manifest changes. External qualified review and actual regression results remain required. The release gate additionally requires full backend catalog and evidence for seven modules per country; scoped salary checks alone cannot satisfy it.
