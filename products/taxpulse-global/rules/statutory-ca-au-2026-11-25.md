# Canada and Australia statutory review — 2026-11-25

Status: partial source review; not approved for production.

## Canada
Reviewed CRA 2026 T4032AB:
https://www.canada.ca/en/revenue-agency/services/forms-publications/payroll/t4032-payroll-deductions-tables/t4032ab-jan/t4032ab-january-general-information.html

Matched CPP 5.95%, exemption 3500, YMPE 74600, maximum 4230.45; CPP2 4%, YAMPE 85000, maximum 416; EI 1.63%, maximum insurable earnings 68900, maximum premium 1123.07. Applies to scoped ordinary employees outside Quebec. Independently derived combined annual maximum: 5769.52.

Outstanding: federal BPA phaseout and all tax bands, Alberta credits and other provincial schedules, annual assessment versus pay-period withholding, Quebec, non-salary modules. Review July 2026 T4127 separately.

## Australia
Reviewed ATO:
https://www.ato.gov.au/tax-rates-and-codes/tax-rates-australian-residents
https://www.ato.gov.au/about-ato/new-legislation/in-detail/individuals/personal-income-tax-new-tax-cuts-for-every-australian-taxpayer
https://www.ato.gov.au/tax-and-super-professionals/for-tax-professionals/prepare-and-lodge/tax-time/before-you-lodge/medicare-levy

FY 2026–27 resident schedule and full 2% Medicare levy match scoped engine. Reference calculations: tax at 100000 = 20520 before levy; at 135000 = 31020; at 190000 = 51370. Low-income offset fixtures added but separate official-source review remains pending.

Outstanding: LITO source confirmation, Medicare exemptions and surcharge, special income, other offsets, tax-return rounding and non-salary modules.

## Evidence
tests/statutory-ca-au.test.mjs contains independent arithmetic fixtures; execution not yet confirmed. No manifest approval or production changes.
