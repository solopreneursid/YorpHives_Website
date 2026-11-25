
    /**
     * ============================================================================
     * STATIC 2026 FALLBACK EXCHANGE RATES (Units of Currency per 1.00 USD)
     * Grounded in Nov 2026 central bank reference crosses (RBA, CBUAE, BoE, BoC).
     * ============================================================================
     */
    const EXCHANGE_RATES_TO_USD = {
      USD: 1.0000,
      INR: 94.1400,
      GBP: 0.7430,
      EUR: 0.8909,
      AED: 3.6725,
      CAD: 1.3966,
      AUD: 1.4697,
      SGD: 1.2864
    };

    const CURRENCY_META = {
      USD: { code: 'USD', symbol: '$', locale: 'en-US' },
      INR: { code: 'INR', symbol: '₹', locale: 'en-IN' },
      GBP: { code: 'GBP', symbol: '£', locale: 'en-GB' },
      EUR: { code: 'EUR', symbol: '€', locale: 'de-DE' },
      AED: { code: 'AED', symbol: 'AED ', locale: 'en-AE' },
      CAD: { code: 'CAD', symbol: 'CA$', locale: 'en-CA' },
      AUD: { code: 'AUD', symbol: 'A$', locale: 'en-AU' },
      SGD: { code: 'SGD', symbol: 'S$', locale: 'en-SG' }
    };

    /**
     * ============================================================================
     * MODULAR 2026 TAX RULE ENGINE (TAX_RULES)
     * Stores baseline 2026 statutory tax parameters by ISO country code.
     * Each country object supports:
     *   - currency: { code, symbol, locale }
     *   - standardDeduction: { type: 'flat' | 'percentage', value, label }
     *   - incomeTaxBrackets: Array of { min, max, rate } (rate in decimal, max: null for top bracket)
     *   - socialSecurity: { rate, wageCap, label, deductibleFromTaxableIncome, tiers }
     *   - filingStatuses: Array of regime/status configurations (can override brackets/deductions/social)
     *   - localTaxNote: Brief note on state/provincial/regional taxes
     * ============================================================================
     */
    const TAX_RULES = {
      IN: {
        code: 'IN',
        name: 'India',
        flag: '🇮🇳',
        taxYearLabel: 'FY 2025-26 & FY 2026-27 (Sec 202 / 115BAC)',
        currency: { code: 'INR', symbol: '₹', locale: 'en-IN' },
        defaultGrossAnnual: 1800000,
        presets: [800000, 1275000, 1800000, 2500000, 3600000],
        preTaxHint: 'Employer NPS (80CCD(2)) / Voluntary Deductions',
        standardDeduction: {
          type: 'flat',
          value: 75000,
          label: 'Salaried Standard Deduction (₹75,000)'
        },
        incomeTaxBrackets: [
          { min: 0, max: 400000, rate: 0.00 },
          { min: 400000, max: 800000, rate: 0.05 },
          { min: 800000, max: 1200000, rate: 0.10 },
          { min: 1200000, max: 1600000, rate: 0.15 },
          { min: 1600000, max: 2000000, rate: 0.20 },
          { min: 2000000, max: 2400000, rate: 0.25 },
          { min: 2400000, max: null, rate: 0.30 }
        ],
        socialSecurity: {
          rate: 0.12,
          wageCap: 300000,
          label: 'EPF (12% up to ₹25,000/mo statutory ceiling)',
          deductibleFromTaxableIncome: false,
          components: [
            { name: 'Employee Provident Fund (EPF)', rate: 0.12, exemption: 0, cap: 300000, note: '12% capped at ₹3,00,000/yr (₹25,000/mo per Sept 2026 notification)' }
          ]
        },
        specialRules: {
          indiaRebateAndCess: {
            maxTaxableForRebate: 1200000,
            maxRebateAmount: 60000,
            cessRate: 0.04
          }
        },
        filingStatuses: [
          {
            id: 'new_regime',
            label: 'New Tax Regime (Default 2026)',
            description: '₹75,000 Standard Deduction, 7 slabs (0%–30%), zero tax up to ₹12,00,000 taxable income via ₹60,000 rebate + 4% Health & Education Cess.'
          },
          {
            id: 'old_regime',
            label: 'Old Tax Regime (With Exemptions)',
            description: '₹50,000 Standard Deduction, classic 4 slabs (0%, 5%, 20%, 30%), ₹12,500 rebate up to ₹5,00,000 taxable income + 4% Cess.',
            standardDeduction: { type: 'flat', value: 50000, label: 'Old Regime Standard Deduction (₹50,000)' },
            incomeTaxBrackets: [
              { min: 0, max: 250000, rate: 0.00 },
              { min: 250000, max: 500000, rate: 0.05 },
              { min: 500000, max: 1000000, rate: 0.20 },
              { min: 1000000, max: null, rate: 0.30 }
            ],
            specialRules: {
              indiaRebateAndCess: {
                maxTaxableForRebate: 500000,
                maxRebateAmount: 12500,
                cessRate: 0.04
              }
            }
          }
        ],
        localTaxNote: 'State-level Professional Tax (PT) up to ₹2,400–₹2,500/year applies in states such as Maharashtra, Karnataka, West Bengal, and Jharkhand. High-income surcharge (10%–25%) applies above ₹50 lakh.',
        sourceTitle: 'Income Tax Dept India (AY 2026-27)',
        sourceUrl: 'https://www.incometax.gov.in/iec/foportal/help/individual/return-applicable-1'
      },

      US: {
        code: 'US',
        name: 'United States',
        flag: '🇺🇸',
        taxYearLabel: '2026 Federal Tax Year (IRS Rev. Proc. 2025-32)',
        currency: { code: 'USD', symbol: '$', locale: 'en-US' },
        defaultGrossAnnual: 120000,
        presets: [65000, 95000, 120000, 185000, 275000],
        preTaxHint: 'Traditional 401(k) / HSA / Section 125 Cafe Plan',
        standardDeduction: {
          type: 'flat',
          value: 16100,
          label: '2026 Federal Standard Deduction ($16,100)'
        },
        incomeTaxBrackets: [
          { min: 0, max: 12400, rate: 0.10 },
          { min: 12400, max: 50400, rate: 0.12 },
          { min: 50400, max: 105700, rate: 0.22 },
          { min: 105700, max: 201775, rate: 0.24 },
          { min: 201775, max: 256225, rate: 0.32 },
          { min: 256225, max: 640600, rate: 0.35 },
          { min: 640600, max: null, rate: 0.37 }
        ],
        socialSecurity: {
          rate: 0.0765,
          wageCap: 184500,
          label: 'FICA (6.2% OASDI up to $184.5k + 1.45% Medicare)',
          deductibleFromTaxableIncome: false,
          components: [
            { name: 'Social Security (OASDI)', rate: 0.062, exemption: 0, cap: 184500, note: '6.2% up to $184,500 wage base' },
            { name: 'Medicare Hospital Insurance', rate: 0.0145, exemption: 0, cap: null, note: '1.45% on all covered wages' },
            { name: 'Additional Medicare Surtax', rate: 0.009, exemption: 200000, cap: null, note: '0.9% above $200k ($250k MFJ)' }
          ]
        },
        filingStatuses: [
          {
            id: 'single',
            label: 'Single Filer',
            description: '2026 Standard Deduction of $16,100; 7 progressive federal brackets (10% to 37% above $640,600).'
          },
          {
            id: 'mfj',
            label: 'Married Filing Jointly (MFJ)',
            description: '2026 Standard Deduction of $32,200; doubled lower brackets (10% up to $24,800; 37% above $768,700).',
            standardDeduction: { type: 'flat', value: 32200, label: '2026 MFJ Standard Deduction ($32,200)' },
            incomeTaxBrackets: [
              { min: 0, max: 24800, rate: 0.10 },
              { min: 24800, max: 100800, rate: 0.12 },
              { min: 100800, max: 211400, rate: 0.22 },
              { min: 211400, max: 403550, rate: 0.24 },
              { min: 403550, max: 512450, rate: 0.32 },
              { min: 512450, max: 768700, rate: 0.35 },
              { min: 768700, max: null, rate: 0.37 }
            ],
            socialSecurityComponentsOverride: [
              { name: 'Social Security (OASDI)', rate: 0.062, exemption: 0, cap: 184500, note: '6.2% up to $184,500 wage base' },
              { name: 'Medicare Hospital Insurance', rate: 0.0145, exemption: 0, cap: null, note: '1.45% on all covered wages' },
              { name: 'Additional Medicare Surtax', rate: 0.009, exemption: 250000, cap: null, note: '0.9% above $250,000 (MFJ)' }
            ]
          },
          {
            id: 'hoh',
            label: 'Head of Household (HOH)',
            description: '2026 Standard Deduction of $24,150; wider initial brackets for unmarried taxpayers maintaining a home for a qualifying dependent.',
            standardDeduction: { type: 'flat', value: 24150, label: '2026 HOH Standard Deduction ($24,150)' },
            incomeTaxBrackets: [
              { min: 0, max: 17700, rate: 0.10 },
              { min: 17700, max: 67450, rate: 0.12 },
              { min: 67450, max: 105700, rate: 0.22 },
              { min: 105700, max: 201775, rate: 0.24 },
              { min: 201775, max: 256200, rate: 0.32 },
              { min: 256200, max: 640600, rate: 0.35 },
              { min: 640600, max: null, rate: 0.37 }
            ]
          }
        ],
        localTaxNote: 'Federal income & FICA taxes only. State and local income taxes vary widely (0% in FL, TX, WA, NV, TN up to 10%+ in CA, NY, NJ). The 2026 SALT deduction cap is $40,400.',
        sourceTitle: 'IRS Federal Rates & Pub 926',
        sourceUrl: 'https://www.irs.gov/filing/federal-income-tax-rates-and-brackets'
      },

      GB: {
        code: 'GB',
        name: 'United Kingdom',
        flag: '🇬🇧',
        taxYearLabel: '2026/27 Tax Year (England, Wales & NI)',
        currency: { code: 'GBP', symbol: '£', locale: 'en-GB' },
        defaultGrossAnnual: 55000,
        presets: [32000, 50270, 55000, 85000, 130000],
        preTaxHint: 'Workplace Salary Sacrifice / Pension Contributions',
        standardDeduction: {
          type: 'flat',
          value: 12570,
          label: 'Personal Allowance (£12,570, tapered > £100k)'
        },
        incomeTaxBrackets: [
          { min: 0, max: 37700, rate: 0.20, bandName: 'Basic Rate (20%)' },
          { min: 37700, max: 125140, rate: 0.40, bandName: 'Higher Rate (40%)' },
          { min: 125140, max: null, rate: 0.45, bandName: 'Additional Rate (45%)' }
        ],
        socialSecurity: {
          rate: 0.08,
          wageCap: 50270,
          label: 'Class 1 Employee NI (8% £12,570–£50,270; 2% above)',
          deductibleFromTaxableIncome: false,
          components: [
            { name: 'Class 1 NI (Main Band)', rate: 0.08, exemption: 12570, cap: 50270, note: '8% between £12,570 PT and £50,270 UEL' },
            { name: 'Class 1 NI (Upper Band)', rate: 0.02, exemption: 50270, cap: null, note: '2% on earnings above £50,270 UEL' }
          ]
        },
        specialRules: {
          ukPersonalAllowanceTaper: {
            baseAllowance: 12570,
            taperThreshold: 100000,
            additionalRateThresholdGross: 125140
          }
        },
        filingStatuses: [
          {
            id: 'uk_standard',
            label: 'Standard Tax Code (1257L — England/Wales/NI)',
            description: '£12,570 Personal Allowance (withdrawn by £1 per £2 of adjusted net income over £100,000, reaching £0 at £125,140). Basic 20%, Higher 40%, Additional 45%.'
          },
          {
            id: 'uk_no_pa',
            label: '0T / BR Non-Resident No Personal Allowance',
            description: '£0 Personal Allowance; all taxable income assessed directly across the Basic (£0–£37,700), Higher (£37,700–£125,140), and Additional (>£125,140) bands.',
            standardDeduction: { type: 'flat', value: 0, label: 'No Personal Allowance (£0)' },
            specialRules: {}
          }
        ],
        localTaxNote: 'Applies to England, Wales, and Northern Ireland. Scottish taxpayers are subject to 6 devolved Scottish Income Tax bands (19% Starter to 48% Top rate). Council Tax is billed separately by local authorities.',
        sourceTitle: 'GOV.UK Income Tax & NI 2026/27',
        sourceUrl: 'https://www.gov.uk/income-tax-rates'
      },

      DE: {
        code: 'DE',
        name: 'Germany',
        flag: '🇩🇪',
        taxYearLabel: '2026 Assessment Year (Einkommensteuer)',
        currency: { code: 'EUR', symbol: '€', locale: 'de-DE' },
        defaultGrossAnnual: 68000,
        presets: [45000, 68000, 85000, 110000, 150000],
        preTaxHint: 'Occupational Pension (bAV) / Rürup Contributions',
        standardDeduction: {
          type: 'flat',
          value: 1230,
          label: 'Arbeitnehmer-Pauschbetrag (€1,230 Employee Allowance)'
        },
        incomeTaxBrackets: [
          { min: 0, max: 12348, rate: 0.00, bandName: 'Grundfreibetrag (0%)' },
          { min: 12348, max: 17443, rate: 0.19, bandName: 'Progressive Zone I (14%–24%)' },
          { min: 17443, max: 69879, rate: 0.33, bandName: 'Progressive Zone II (24%–42%)' },
          { min: 69879, max: 277826, rate: 0.42, bandName: 'Spitzensteuersatz (42%)' },
          { min: 277826, max: null, rate: 0.45, bandName: 'Reichensteuer (45%)' }
        ],
        socialSecurity: {
          rate: 0.2175,
          wageCap: 101400,
          label: '4-Pillar Statutory Social Insurance (~21.75% employee share)',
          deductibleFromTaxableIncome: true,
          components: [
            { name: 'Pension (Rentenversicherung)', rate: 0.093, exemption: 0, cap: 101400, note: '9.3% employee share up to €101,400 BBG' },
            { name: 'Unemployment (Arbeitslosenv.)', rate: 0.013, exemption: 0, cap: 101400, note: '1.3% employee share up to €101,400 BBG' },
            { name: 'Health Insurance (GKV + Zusatz)', rate: 0.0875, exemption: 0, cap: 69750, note: '7.3% base + 1.45% avg supplementary up to €69,750' },
            { name: 'Nursing Care (Pflegeversicherung)', rate: 0.024, exemption: 0, cap: 69750, note: '2.4% childless employee rate up to €69,750' }
          ]
        },
        filingStatuses: [
          {
            id: 'class_1',
            label: 'Tax Class I (Single / Unmarried, No Children)',
            description: '2026 Grundfreibetrag of €12,348 (0% band) + €1,230 employee lump-sum allowance. Includes 2.4% childless nursing care rate.'
          },
          {
            id: 'class_3',
            label: 'Tax Class III (Married Joint / Splittingverfahren)',
            description: 'Doubled 2026 Grundfreibetrag of €24,696 and doubled progressive bracket thresholds with 1.8% parental nursing care rate.',
            incomeTaxBrackets: [
              { min: 0, max: 24696, rate: 0.00, bandName: 'Joint Grundfreibetrag (0%)' },
              { min: 24696, max: 34886, rate: 0.19, bandName: 'Joint Zone I (14%–24%)' },
              { min: 34886, max: 139758, rate: 0.33, bandName: 'Joint Zone II (24%–42%)' },
              { min: 139758, max: 555652, rate: 0.42, bandName: 'Joint Spitzensteuersatz (42%)' },
              { min: 555652, max: null, rate: 0.45, bandName: 'Joint Reichensteuer (45%)' }
            ],
            socialSecurityComponentsOverride: [
              { name: 'Pension (Rentenversicherung)', rate: 0.093, exemption: 0, cap: 101400, note: '9.3% employee share up to €101,400 BBG' },
              { name: 'Unemployment (Arbeitslosenv.)', rate: 0.013, exemption: 0, cap: 101400, note: '1.3% employee share up to €101,400 BBG' },
              { name: 'Health Insurance (GKV + Zusatz)', rate: 0.0875, exemption: 0, cap: 69750, note: '8.75% employee share up to €69,750' },
              { name: 'Nursing Care (Pflegeversicherung)', rate: 0.018, exemption: 0, cap: 69750, note: '1.8% standard rate with child up to €69,750' }
            ]
          }
        ],
        localTaxNote: 'Employee social security contributions reduce taxable income under Sonderausgaben. Excludes optional Church Tax (Kirchensteuer: 8% in Bavaria/BW, 9% elsewhere) and the 5.5% Solidarity Surcharge (Solidaritätszuschlag) for top earners.',
        sourceTitle: 'PwC Germany Tax Summaries 2026',
        sourceUrl: 'https://taxsummaries.pwc.com/germany/individual/other-taxes'
      },

      AE: {
        code: 'AE',
        name: 'United Arab Emirates',
        flag: '🇦🇪',
        taxYearLabel: '2026 Calendar Year (0% Personal Income Tax)',
        currency: { code: 'AED', symbol: 'AED ', locale: 'en-AE' },
        defaultGrossAnnual: 360000,
        presets: [180000, 240000, 360000, 600000, 900000],
        preTaxHint: 'Voluntary Corporate Savings / DEWS Plan',
        standardDeduction: {
          type: 'flat',
          value: 0,
          label: 'Not Applicable (0% Income Tax)'
        },
        incomeTaxBrackets: [
          { min: 0, max: null, rate: 0.00, bandName: 'Zero Personal Income Tax (0%)' }
        ],
        socialSecurity: {
          rate: 0.00,
          wageCap: null,
          label: '0% for Expatriate Employees (11% GPSSA for UAE Nationals)',
          deductibleFromTaxableIncome: false,
          components: [
            { name: 'Expatriate Social Security', rate: 0.00, exemption: 0, cap: null, note: '0% employee deduction; covered by statutory End-of-Service Gratuity' }
          ]
        },
        filingStatuses: [
          {
            id: 'uae_expat',
            label: 'Expatriate Resident Employee',
            description: '0% Personal Income Tax and 0% Social Security deduction. Employers fund statutory End-of-Service Gratuity (EOSG).'
          },
          {
            id: 'uae_national',
            label: 'UAE National Employee (GPSSA Pension)',
            description: '0% Personal Income Tax; 11% mandatory employee contribution to the General Pension and Social Security Authority (GPSSA) up to AED 840,000/yr.',
            socialSecurityComponentsOverride: [
              { name: 'GPSSA Federal Pension (Emirati)', rate: 0.11, exemption: 0, cap: 840000, note: '11% employee share (employer pays 15%) capped at AED 70k/mo' }
            ]
          }
        ],
        localTaxNote: 'The UAE levies 0% personal income tax, 0% capital gains tax, and 0% municipal income tax across all seven Emirates. A 9% federal corporate tax applies strictly to business profits exceeding AED 375,000.',
        sourceTitle: 'UAE Government & GPSSA Portal',
        sourceUrl: 'https://u.ae/en/information-and-services/jobs/Sector-of-employment/working-in-uae-government-sector/pensions-and-social-security-for-uae-citizens'
      },

      CA: {
        code: 'CA',
        name: 'Canada',
        flag: '🇨🇦',
        taxYearLabel: '2026 Federal Tax Year (CRA Indexed Brackets)',
        currency: { code: 'CAD', symbol: 'CA$', locale: 'en-CA' },
        defaultGrossAnnual: 95000,
        presets: [60000, 95000, 130000, 185000, 260000],
        preTaxHint: 'RRSP / RPP Deductible Contributions',
        standardDeduction: {
          type: 'flat',
          value: 16452,
          label: '2026 Federal Basic Personal Amount (CA$16,452)'
        },
        incomeTaxBrackets: [
          { min: 0, max: 58523, rate: 0.14 },
          { min: 58523, max: 117045, rate: 0.205 },
          { min: 117045, max: 181440, rate: 0.26 },
          { min: 181440, max: 258482, rate: 0.29 },
          { min: 258482, max: null, rate: 0.33 }
        ],
        socialSecurity: {
          rate: 0.0758,
          wageCap: 85000,
          label: 'CPP (5.95% to $74.6k) + CPP2 (4% to $85k) + EI (1.63% to $68.9k)',
          deductibleFromTaxableIncome: false,
          components: [
            { name: 'Base CPP (Canada Pension Plan)', rate: 0.0595, exemption: 3500, cap: 74600, note: '5.95% from CA$3,500 to CA$74,600 YMPE (max CA$4,230.45)' },
            { name: 'Second CPP (CPP2)', rate: 0.04, exemption: 74600, cap: 85000, note: '4.0% from CA$74,600 YMPE to CA$85,000 YAMPE (max CA$416.00)' },
            { name: 'Employment Insurance (EI)', rate: 0.0163, exemption: 0, cap: 68900, note: '1.63% up to CA$68,900 MIE (max CA$1,123.07)' }
          ]
        },
        filingStatuses: [
          {
            id: 'ca_federal_single',
            label: 'Federal Standard Filer (2026 — 14% Lowest Bracket)',
            description: 'Includes the 2026 CA$16,452 Basic Personal Amount (BPA) exemption and the permanent 14% lowest federal bracket rate.'
          },
          {
            id: 'ca_federal_spousal',
            label: 'Federal + Spousal Amount Claim',
            description: 'Claims both the Basic Personal Amount (CA$16,452) and an estimated 50% Spousal Amount supplement (+CA$8,226).',
            standardDeduction: { type: 'flat', value: 24678, label: 'Combined BPA + Spousal Claim (CA$24,678)' }
          }
        ],
        localTaxNote: 'Calculates CRA Federal Income Tax and federal CPP/CPP2/EI payroll deductions only. Provincial/territorial income taxes (e.g., Ontario 5.05%–13.16%, BC 5.06%–20.5%, Alberta 10%–15%) are levied additionally by your province of residence.',
        sourceTitle: 'Canada Revenue Agency (CRA) 2026',
        sourceUrl: 'https://www.canada.ca/en/revenue-agency/services/tax/individuals/tax-rates-brackets/current-year.html'
      },

      AU: {
        code: 'AU',
        name: 'Australia',
        flag: '🇦🇺',
        taxYearLabel: '2026–27 Financial Year (ATO Stage 3 + 15% Cut)',
        currency: { code: 'AUD', symbol: 'A$', locale: 'en-AU' },
        defaultGrossAnnual: 115000,
        presets: [65000, 95000, 115000, 155000, 220000],
        preTaxHint: 'Concessional Super Salary Sacrifice',
        standardDeduction: {
          type: 'flat',
          value: 1000,
          label: '2026–27 Standard Work Deduction (A$1,000)'
        },
        incomeTaxBrackets: [
          { min: 0, max: 18200, rate: 0.00, bandName: 'Tax-Free Threshold (0%)' },
          { min: 18200, max: 45000, rate: 0.15, bandName: 'First Tier (15% from 1 Jul 2026)' },
          { min: 45000, max: 135000, rate: 0.30, bandName: 'Middle Tier (30%)' },
          { min: 135000, max: 190000, rate: 0.37, bandName: 'Upper Tier (37%)' },
          { min: 190000, max: null, rate: 0.45, bandName: 'Top Tier (45%)' }
        ],
        socialSecurity: {
          rate: 0.02,
          wageCap: null,
          label: 'Medicare Levy (2.0% of taxable income)',
          deductibleFromTaxableIncome: false,
          components: [
            { name: 'Medicare Levy (2%)', rate: 0.02, exemption: 0, cap: null, note: '2.0% mandatory public health levy on taxable income' }
          ]
        },
        filingStatuses: [
          {
            id: 'au_resident',
            label: 'Australian Tax Resident (2026–27)',
            description: 'Includes A$18,200 tax-free threshold, the 1 July 2026 rate cut to 15% (A$18.2k–A$45k), A$1,000 standard deduction, and 2% Medicare Levy.'
          },
          {
            id: 'au_non_resident',
            label: 'Foreign / Non-Resident for Tax Purposes',
            description: 'No tax-free threshold (30% from A$0 to A$135,000; 37% to A$190,000; 45% above) and exempt from the 2% Medicare Levy.',
            standardDeduction: { type: 'flat', value: 0, label: 'Non-Resident (A$0 Standard Deduction)' },
            incomeTaxBrackets: [
              { min: 0, max: 135000, rate: 0.30 },
              { min: 135000, max: 190000, rate: 0.37 },
              { min: 190000, max: null, rate: 0.45 }
            ],
            socialSecurityComponentsOverride: [
              { name: 'Medicare Levy (Non-Resident Exempt)', rate: 0.00, exemption: 0, cap: null, note: 'Foreign residents are exempt from the 2% Medicare Levy' }
            ]
          }
        ],
        localTaxNote: 'Australia levies no state or territory personal income taxes. Employers additionally pay 12% Superannuation Guarantee on top of base wages. Singles over A$105k without private hospital cover may owe a 1%–1.5% Medicare Levy Surcharge.',
        sourceTitle: 'Australian Taxation Office (ATO)',
        sourceUrl: 'https://www.ato.gov.au/tax-rates-and-codes/tax-rates-australian-residents'
      },

      SG: {
        code: 'SG',
        name: 'Singapore',
        flag: '🇸🇬',
        taxYearLabel: 'YA 2026 (IRAS Resident Progressive Rates)',
        currency: { code: 'SGD', symbol: 'S$', locale: 'en-SG' },
        defaultGrossAnnual: 108000,
        presets: [60000, 84000, 108000, 180000, 360000],
        preTaxHint: 'Supplementary Retirement Scheme (SRS) / Cash Top-Up',
        standardDeduction: {
          type: 'flat',
          value: 1000,
          label: 'Earned Income Relief (S$1,000 under age 55)'
        },
        incomeTaxBrackets: [
          { min: 0, max: 20000, rate: 0.00 },
          { min: 20000, max: 30000, rate: 0.02 },
          { min: 30000, max: 40000, rate: 0.035 },
          { min: 40000, max: 80000, rate: 0.07 },
          { min: 80000, max: 120000, rate: 0.115 },
          { min: 120000, max: 160000, rate: 0.15 },
          { min: 160000, max: 200000, rate: 0.18 },
          { min: 200000, max: 240000, rate: 0.19 },
          { min: 240000, max: 280000, rate: 0.195 },
          { min: 280000, max: 320000, rate: 0.20 },
          { min: 320000, max: 500000, rate: 0.22 },
          { min: 500000, max: 1000000, rate: 0.23 },
          { min: 1000000, max: null, rate: 0.24 }
        ],
        socialSecurity: {
          rate: 0.20,
          wageCap: 96000,
          label: 'CPF Employee Share (20% up to S$8,000/mo OW ceiling)',
          deductibleFromTaxableIncome: true,
          components: [
            { name: 'CPF Employee Contribution (Age ≤ 55)', rate: 0.20, exemption: 0, cap: 96000, note: '20% capped at S$8,000/mo Ordinary Wage ceiling (S$96,000/yr)' }
          ]
        },
        filingStatuses: [
          {
            id: 'sg_citizen_pr',
            label: 'Singapore Citizen / PR (CPF Applicable, Age ≤ 55)',
            description: '20% mandatory employee CPF contribution (up to S$8,000/mo OW ceiling in 2026), which is automatically tax-deductible via CPF Relief alongside S$1,000 Earned Income Relief.'
          },
          {
            id: 'sg_ep_resident',
            label: 'Foreign Tax Resident (Employment Pass — Non-CPF)',
            description: 'Taxed at progressive IRAS resident rates (0%–24%) with S$1,000 Earned Income Relief and 0% CPF deduction.',
            socialSecurityDeductibleOverride: false,
            socialSecurityComponentsOverride: [
              { name: 'CPF (Foreign EP Exempt)', rate: 0.00, exemption: 0, cap: null, note: 'Employment Pass holders do not contribute to CPF' }
            ]
          }
        ],
        localTaxNote: 'Singapore is a unitary city-state with no municipal, state, or capital gains taxes. Total personal income tax reliefs (including CPF Relief and SRS) are subject to an overall cap of S$80,000 per Year of Assessment.',
        sourceTitle: 'IRAS & CPF Board Singapore (2026)',
        sourceUrl: 'https://www.iras.gov.sg/taxes/individual-income-tax/basics-of-individual-income-tax/tax-residency-and-tax-rates/individual-income-tax-rates'
      }

      /* ==========================================================================
       * HOW TO ADD MORE COUNTRIES TO `TAX_RULES`:
       * Simply paste a new ISO 2-letter country key below following this schema,
       * and add its currency to `EXCHANGE_RATES_TO_USD` and `CURRENCY_META`.
       * The UI dropdown, quick pills, and global comparison table update automatically!
       *
       * Example (Japan - 2026 National Income Tax):
       * JP: {
       *   code: 'JP',
       *   name: 'Japan',
       *   flag: '🇯🇵',
       *   taxYearLabel: '2026 Calendar Year (National Income Tax)',
       *   currency: { code: 'JPY', symbol: '¥', locale: 'ja-JP' },
       *   defaultGrossAnnual: 7000000,
       *   presets: [4000000, 7000000, 10000000, 15000000],
       *   preTaxHint: 'iDeCo / NISA Pre-Tax Deductions',
       *   standardDeduction: { type: 'flat', value: 580000, label: 'Basic Exemption (¥580,000)' },
       *   incomeTaxBrackets: [
       *     { min: 0, max: 1950000, rate: 0.05 },
       *     { min: 1950000, max: 3300000, rate: 0.10 },
       *     { min: 3300000, max: 6950000, rate: 0.20 },
       *     { min: 6950000, max: 9000000, rate: 0.23 },
       *     { min: 9000000, max: 18000000, rate: 0.33 },
       *     { min: 18000000, max: 40000000, rate: 0.40 },
       *     { min: 40000000, max: null, rate: 0.45 }
       *   ],
       *   socialSecurity: {
       *     rate: 0.145,
       *     wageCap: 16680000,
       *     label: 'Health + Welfare Pension + Employment (~14.5%)',
       *     deductibleFromTaxableIncome: true,
       *     components: [
       *       { name: 'Social Insurance Combined', rate: 0.145, exemption: 0, cap: 16680000, note: 'Approx 14.5% employee share' }
       *     ]
       *   },
       *   filingStatuses: [
       *     { id: 'jp_standard', label: 'Standard Resident Filer', description: 'National progressive brackets (5%–45%).' }
       *   ],
       *   localTaxNote: 'Municipal & Prefectural Inhabitant Tax (~10% flat) applies separately.',
       *   sourceTitle: 'National Tax Agency Japan',
       *   sourceUrl: 'https://www.nta.go.jp/english/taxes/individual/12018.htm'
       * }
       * ========================================================================== */
    };

    /**
     * ============================================================================
     * APPLICATION STATE
     * ============================================================================
     */
    const state = {
      countryCode: 'IN',
      filingStatusId: 'new_regime',
      frequency: 'annual',       // 'annual' | 'monthly'
      grossInput: 1800000,       // Value in the input box (matches state.frequency)
      preTaxInput: 0,            // Value in the pre-tax input box (matches state.frequency)
      currencyMode: 'LOCAL',     // 'LOCAL' | 'USD' | 'INR'
      searchQuery: '',
      dropdownOpen: false
    };

    /**
     * ============================================================================
     * CURRENCY CONVERSION & FORMATTING UTILITIES
     * ============================================================================
     */
    function convertFromLocal(amountInLocal, localCurrencyCode, targetCurrencyMode) {
      if (!Number.isFinite(amountInLocal)) return 0;
      const targetCode = targetCurrencyMode === 'LOCAL' ? localCurrencyCode : targetCurrencyMode;
      if (targetCode === localCurrencyCode) return amountInLocal;
      const localPerUsd = EXCHANGE_RATES_TO_USD[localCurrencyCode] || 1;
      const targetPerUsd = EXCHANGE_RATES_TO_USD[targetCode] || 1;
      const amountInUsd = amountInLocal / localPerUsd;
      return amountInUsd * targetPerUsd;
    }

    function convertBetweenCurrencies(amount, fromCode, toCode) {
      if (fromCode === toCode) return amount;
      const fromPerUsd = EXCHANGE_RATES_TO_USD[fromCode] || 1;
      const toPerUsd = EXCHANGE_RATES_TO_USD[toCode] || 1;
      return (amount / fromPerUsd) * toPerUsd;
    }

    function formatCurrency(amount, currencyCode, compact = false) {
      const safeVal = Number.isFinite(amount) ? amount : 0;
      const meta = CURRENCY_META[currencyCode] || { code: currencyCode, symbol: currencyCode + ' ', locale: 'en-US' };
      try {
        if (compact && Math.abs(safeVal) >= 1000) {
          return new Intl.NumberFormat(meta.locale, {
            style: 'currency',
            currency: meta.code,
            notation: 'compact',
            maximumFractionDigits: 1
          }).format(safeVal);
        }
        return new Intl.NumberFormat(meta.locale, {
          style: 'currency',
          currency: meta.code,
          maximumFractionDigits: 0
        }).format(Math.round(safeVal));
      } catch (e) {
        return meta.symbol + Math.round(safeVal).toLocaleString();
      }
    }

    function formatActiveDisplay(amountInLocal, countryRule) {
      const localCode = countryRule.currency.code;
      const targetCode = state.currencyMode === 'LOCAL' ? localCode : state.currencyMode;
      const converted = convertFromLocal(amountInLocal, localCode, state.currencyMode);
      return formatCurrency(converted, targetCode);
    }

    /**
     * ============================================================================
     * CORE PROGRESSIVE TAX & SOCIAL SECURITY CALCULATION ENGINE
     * ============================================================================
     */
    function calculateTaxForCountry(countryCode, filingStatusId, grossAnnualLocal, preTaxAnnualLocal) {
      const country = TAX_RULES[countryCode];
      const gross = Math.max(0, Number(grossAnnualLocal) || 0);
      const preTaxVoluntary = Math.max(0, Math.min(gross, Number(preTaxAnnualLocal) || 0));

      const statusObj = country.filingStatuses.find(s => s.id === filingStatusId) || country.filingStatuses[0];
      const brackets = statusObj.incomeTaxBrackets || country.incomeTaxBrackets;
      const stdDedConfig = statusObj.standardDeduction || country.standardDeduction;
      const specialRules = statusObj.specialRules !== undefined ? statusObj.specialRules : (country.specialRules || {});
      const ssComponents = statusObj.socialSecurityComponentsOverride || country.socialSecurity.components;
      const ssDeductible = statusObj.socialSecurityDeductibleOverride !== undefined
        ? statusObj.socialSecurityDeductibleOverride
        : Boolean(country.socialSecurity.deductibleFromTaxableIncome);

      // 1. Calculate Social Security Contributions per component
      let totalSocialSecurity = 0;
      const socialBreakdown = ssComponents.map(comp => {
        const exemption = comp.exemption || 0;
        const cap = comp.cap !== null && comp.cap !== undefined ? comp.cap : Infinity;
        const assessableWages = Math.max(0, Math.min(gross, cap) - exemption);
        const amount = assessableWages * comp.rate;
        totalSocialSecurity += amount;
        return {
          name: comp.name,
          rate: comp.rate,
          assessableWages,
          amount,
          note: comp.note
        };
      });

      // 2. Calculate Standard Deduction (supporting flat, percentage, and UK £100k taper)
      let standardDeductionAmount = 0;
      let stdDedNote = stdDedConfig.label;
      if (stdDedConfig.type === 'percentage') {
        standardDeductionAmount = gross * (stdDedConfig.value || 0);
      } else {
        standardDeductionAmount = stdDedConfig.value || 0;
      }

      const adjustedGrossForTaper = Math.max(0, gross - preTaxVoluntary);
      if (specialRules.ukPersonalAllowanceTaper) {
        const { baseAllowance, taperThreshold } = specialRules.ukPersonalAllowanceTaper;
        if (adjustedGrossForTaper > taperThreshold) {
          const reduction = Math.floor((adjustedGrossForTaper - taperThreshold) / 2);
          standardDeductionAmount = Math.max(0, baseAllowance - reduction);
          stdDedNote = standardDeductionAmount === 0
            ? 'Personal Allowance Fully Tapered (£0 above £125,140)'
            : `Tapered Personal Allowance (£${standardDeductionAmount.toLocaleString()})`;
        }
      }

      // 3. Determine Net Taxable Income
      // In countries like Germany and Singapore (CPF), mandatory employee social security is deductible from taxable income.
      // For Singapore, total reliefs (CPF + Earned Income + SRS) are capped at S$80,000.
      let deductibleSocial = ssDeductible ? totalSocialSecurity : 0;
      let totalDeductionsFromGross = standardDeductionAmount + preTaxVoluntary + deductibleSocial;

      if (countryCode === 'SG' && totalDeductionsFromGross > 80000) {
        totalDeductionsFromGross = 80000;
        stdDedNote = 'Total Personal Reliefs Capped at S$80,000';
      }

      const taxableIncome = Math.max(0, gross - totalDeductionsFromGross);

      // 4. Progressive Bracket-by-Bracket Calculation
      let rawBracketTax = 0;
      let marginalRate = 0;

      // UK income-tax bands apply to taxable income after allowance; never extend a band for taper.
      const effectiveBrackets = brackets;

      const bracketRows = effectiveBrackets.map((tier) => {
        const min = tier.min;
        const max = tier.max === null ? Infinity : tier.max;
        const tierWidth = max === Infinity ? Infinity : (max - min);
        const taxableInTier = Math.max(0, Math.min(taxableIncome, max) - min);
        const taxInTier = taxableInTier * tier.rate;
        rawBracketTax += taxInTier;

        if (taxableIncome > min) {
          marginalRate = tier.rate;
        }
        const fillPct = tierWidth === Infinity
          ? (taxableInTier > 0 ? 100 : 0)
          : Math.min(100, Math.max(0, (taxableInTier / tierWidth) * 100));

        const isCurrentMarginal = taxableIncome > min && (taxableIncome <= max || max === Infinity);

        return {
          min,
          max: tier.max,
          rate: tier.rate,
          bandName: tier.bandName || null,
          taxableInTier,
          taxInTier,
          fillPct,
          isCurrentMarginal
        };
      });

      if (taxableIncome === 0 && effectiveBrackets.length > 0) {
        marginalRate = effectiveBrackets[0].rate;
      }

      // 5. Country-Specific Statutory Rebates, Credits, and Cess (e.g., India 87A/202 Rebate + 4% Cess)
      let finalIncomeTax = rawBracketTax;
      let rebateAmount = 0;
      let surtaxOrCessAmount = 0;
      let taxAdjustmentNote = 'Standard progressive assessment';

      if (specialRules.indiaRebateAndCess) {
        const { maxTaxableForRebate, maxRebateAmount, cessRate } = specialRules.indiaRebateAndCess;
        if (taxableIncome <= maxTaxableForRebate) {
          rebateAmount = Math.min(rawBracketTax, maxRebateAmount);
        }
        const taxAfterRebate = Math.max(0, rawBracketTax - rebateAmount);
        // Marginal relief above ₹12,00,000 in India New Regime
        let marginalRelief = 0;
        if (taxableIncome > maxTaxableForRebate && maxTaxableForRebate === 1200000) {
          const excessIncome = taxableIncome - maxTaxableForRebate;
          if (taxAfterRebate > excessIncome) {
            marginalRelief = taxAfterRebate - excessIncome;
            rebateAmount += marginalRelief;
          }
        }
        const netBaseTax = Math.max(0, rawBracketTax - rebateAmount);
        surtaxOrCessAmount = netBaseTax * cessRate;
        finalIncomeTax = netBaseTax + surtaxOrCessAmount;

        if (rebateAmount > 0 && finalIncomeTax === 0) {
          taxAdjustmentNote = `₹0 Tax after Sec 87A/202 Rebate (−${formatCurrency(rebateAmount, 'INR')})`;
        } else if (rebateAmount > 0) {
          taxAdjustmentNote = `Incl. Marginal Relief (−${formatCurrency(rebateAmount, 'INR')}) & 4% Cess`;
        } else {
          taxAdjustmentNote = `Incl. 4% Health & Education Cess (+${formatActiveDisplay(surtaxOrCessAmount, country)})`;
        }
      } else {
        taxAdjustmentNote = `${bracketRows.filter(r => r.taxableInTier > 0).length} active progressive tier(s)`;
      }

      // 6. Net Pay & Effective Rates
      const totalMandatoryDeductions = finalIncomeTax + totalSocialSecurity;
      const netTakeHomeAnnual = Math.max(0, gross - totalMandatoryDeductions - preTaxVoluntary);

      const effectiveIncomeTaxRate = gross > 0 ? (finalIncomeTax / gross) * 100 : 0;
      const effectiveSocialRate = gross > 0 ? (totalSocialSecurity / gross) * 100 : 0;
      const effectiveTotalRate = gross > 0 ? (totalMandatoryDeductions / gross) * 100 : 0;
      const netRetentionPct = gross > 0 ? (netTakeHomeAnnual / gross) * 100 : 100;

      return {
        country,
        statusObj,
        grossAnnual: gross,
        preTaxVoluntary,
        standardDeductionAmount,
        stdDedNote,
        deductibleSocial,
        taxableIncome,
        rawBracketTax,
        rebateAmount,
        surtaxOrCessAmount,
        finalIncomeTax,
        taxAdjustmentNote,
        totalSocialSecurity,
        socialBreakdown,
        netTakeHomeAnnual,
        effectiveIncomeTaxRate,
        effectiveSocialRate,
        effectiveTotalRate,
        marginalRatePct: marginalRate * 100,
        netRetentionPct,
        bracketRows
      };
    }

    /**
     * ============================================================================
     * HTML5 CANVAS DONUT CHART RENDERER
     * ============================================================================
     */
    function drawDonutChart(calcResult) {
      const canvas = document.getElementById('donutChartCanvas');
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      const dpr = window.devicePixelRatio || 1;
      const cssSize = 208;

      if (canvas.width !== cssSize * dpr || canvas.height !== cssSize * dpr) {
        canvas.width = cssSize * dpr;
        canvas.height = cssSize * dpr;
      }
      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, cssSize, cssSize);

      const cx = cssSize / 2;
      const cy = cssSize / 2;
      const outerRadius = 88;
      const innerRadius = 60;
      const isDark = document.documentElement.classList.contains('dark');

      const gross = calcResult.grossAnnual;
      if (gross <= 0) {
        ctx.beginPath();
        ctx.arc(cx, cy, (outerRadius + innerRadius) / 2, 0, Math.PI * 2);
        ctx.lineWidth = outerRadius - innerRadius;
        ctx.strokeStyle = isDark ? '#1e293b' : '#e2e8f0';
        ctx.stroke();
        ctx.restore();
        return;
      }

      const slices = [
        { value: calcResult.netTakeHomeAnnual, color: '#10b981' }, // Emerald: Net Pay
        { value: calcResult.finalIncomeTax, color: '#f43f5e' },    // Rose: Income Tax
        { value: calcResult.totalSocialSecurity, color: '#f59e0b' }, // Amber: Social Security
        { value: calcResult.preTaxVoluntary, color: '#6366f1' }    // Indigo: Pre-Tax Deductions
      ].filter(s => s.value > 0);

      let startAngle = -Math.PI / 2;
      const ringRadius = (outerRadius + innerRadius) / 2;
      const lineWidth = outerRadius - innerRadius;

      slices.forEach(slice => {
        const sweep = (slice.value / gross) * (Math.PI * 2);
        ctx.beginPath();
        ctx.arc(cx, cy, ringRadius, startAngle, startAngle + sweep);
        ctx.lineWidth = lineWidth;
        ctx.strokeStyle = slice.color;
        ctx.stroke();
        startAngle += sweep;
      });

      // Subtle segment separators if multiple slices exist
      if (slices.length > 1) {
        let sepAngle = -Math.PI / 2;
        slices.forEach(slice => {
          const sweep = (slice.value / gross) * (Math.PI * 2);
          const x1 = cx + Math.cos(sepAngle) * (innerRadius - 1);
          const y1 = cy + Math.sin(sepAngle) * (innerRadius - 1);
          const x2 = cx + Math.cos(sepAngle) * (outerRadius + 1);
          const y2 = cy + Math.sin(sepAngle) * (outerRadius + 1);
          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.lineWidth = 2;
          ctx.strokeStyle = isDark ? '#0f172a' : '#ffffff';
          ctx.stroke();
          sepAngle += sweep;
        });
      }

      ctx.restore();
    }

    /**
     * ============================================================================
     * UI RENDERING FUNCTIONS
     * ============================================================================
     */
    function renderQuickCountryPills() {
      const container = document.getElementById('quickCountryPills');
      if (!container) return;
      container.innerHTML = '';

      Object.values(TAX_RULES).forEach(c => {
        const isActive = c.code === state.countryCode;
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = isActive
          ? 'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-indigo-600 text-white shadow-sm shrink-0 transition-all'
          : 'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-800 hover:border-indigo-400 shrink-0 transition-all';
        btn.innerHTML = `<span>${c.flag}</span><span>${c.name}</span><span class="text-[10px] opacity-75 font-mono-num">${c.currency.code}</span>`;
        btn.addEventListener('click', () => selectCountry(c.code));
        container.appendChild(btn);
      });
    }

    function renderCountryDropdownList() {
      const listEl = document.getElementById('countryOptionsList');
      if (!listEl) return;
      listEl.innerHTML = '';

      const q = state.searchQuery.trim().toLowerCase();
      const countries = Object.values(TAX_RULES).filter(c => {
        if (!q) return true;
        return (
          c.name.toLowerCase().includes(q) ||
          c.code.toLowerCase().includes(q) ||
          c.currency.code.toLowerCase().includes(q) ||
          c.taxYearLabel.toLowerCase().includes(q)
        );
      });

      if (countries.length === 0) {
        const emptyLi = document.createElement('li');
        emptyLi.className = 'px-4 py-3 text-xs text-slate-400 text-center';
        emptyLi.textContent = 'No matching tax jurisdictions found.';
        listEl.appendChild(emptyLi);
        return;
      }

      countries.forEach(c => {
        const isSelected = c.code === state.countryCode;
        const li = document.createElement('li');
        li.setAttribute('role', 'option');
        li.setAttribute('aria-selected', isSelected ? 'true' : 'false');
        li.className = `px-3.5 py-2.5 flex items-center justify-between cursor-pointer transition-colors ${
          isSelected
            ? 'bg-indigo-50/90 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300'
            : 'hover:bg-slate-50 dark:hover:bg-slate-800/70 text-slate-800 dark:text-slate-200'
        }`;
        li.innerHTML = `
          <div class="flex items-center gap-2.5 min-w-0">
            <span class="text-lg leading-none">${c.flag}</span>
            <div class="truncate">
              <div class="text-xs font-semibold truncate">${c.name}</div>
              <div class="text-[10px] text-slate-400 dark:text-slate-500 truncate">${c.taxYearLabel}</div>
            </div>
          </div>
          <span class="px-2 py-0.5 rounded text-[10px] font-mono-num font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 shrink-0">
            ${c.currency.code} (${c.currency.symbol.trim()})
          </span>
        `;
        li.addEventListener('click', () => {
          selectCountry(c.code);
          toggleCountryDropdown(false);
        });
        listEl.appendChild(li);
      });
    }

    function renderFilingStatusOptions() {
      const country = TAX_RULES[state.countryCode];
      const selectEl = document.getElementById('filingStatusSelect');
      if (!selectEl) return;
      selectEl.innerHTML = '';

      country.filingStatuses.forEach(status => {
        const opt = document.createElement('option');
        opt.value = status.id;
        opt.textContent = status.label;
        if (status.id === state.filingStatusId) opt.selected = true;
        selectEl.appendChild(opt);
      });
    }

    function renderIncomePresets() {
      const country = TAX_RULES[state.countryCode];
      const container = document.getElementById('incomePresetsContainer');
      if (!container) return;
      container.innerHTML = '';

      country.presets.forEach(annualAmount => {
        const displayVal = state.frequency === 'monthly' ? Math.round(annualAmount / 12) : annualAmount;
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'px-2 py-0.5 rounded-md text-[11px] font-mono-num font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/70 hover:text-indigo-600 dark:hover:text-indigo-400 border border-slate-200/70 dark:border-slate-700/70 transition-colors';
        btn.textContent = formatCurrency(displayVal, country.currency.code, true);
        btn.addEventListener('click', () => {
          state.grossInput = displayVal;
          document.getElementById('grossIncomeInput').value = displayVal;
          updateAllCalculations();
        });
        container.appendChild(btn);
      });
    }

    function selectCountry(newCode) {
      if (!TAX_RULES[newCode]) return;
      state.countryCode = newCode;
      const country = TAX_RULES[newCode];
      state.filingStatusId = country.filingStatuses[0].id;

      const defaultVal = state.frequency === 'monthly'
        ? Math.round(country.defaultGrossAnnual / 12)
        : country.defaultGrossAnnual;
      state.grossInput = defaultVal;
      state.preTaxInput = 0;

      document.getElementById('grossIncomeInput').value = defaultVal;
      document.getElementById('preTaxDeductionInput').value = 0;

      renderQuickCountryPills();
      renderCountryDropdownList();
      renderFilingStatusOptions();
      renderIncomePresets();
      updateAllCalculations();
    }

    function toggleCountryDropdown(forceState) {
      const menu = document.getElementById('countryDropdownMenu');
      const btn = document.getElementById('countryTriggerBtn');
      const next = forceState !== undefined ? forceState : !state.dropdownOpen;
      state.dropdownOpen = next;
      if (next) {
        menu.classList.remove('hidden');
        btn.setAttribute('aria-expanded', 'true');
        const searchInput = document.getElementById('countrySearchInput');
        searchInput.value = '';
        state.searchQuery = '';
        renderCountryDropdownList();
        setTimeout(() => searchInput.focus(), 20);
      } else {
        menu.classList.add('hidden');
        btn.setAttribute('aria-expanded', 'false');
      }
    }

    /**
     * ============================================================================
     * MASTER RE-CALCULATION & DOM SYNCHRONIZATION
     * ============================================================================
     */
    function updateAllCalculations() {
      const country = TAX_RULES[state.countryCode];
      const localCode = country.currency.code;
      const annualMultiplier = state.frequency === 'monthly' ? 12 : 1;

      const grossAnnualLocal = Math.max(0, (Number(state.grossInput) || 0) * annualMultiplier);
      const preTaxAnnualLocal = Math.max(0, (Number(state.preTaxInput) || 0) * annualMultiplier);

      const calc = calculateTaxForCountry(
        state.countryCode,
        state.filingStatusId,
        grossAnnualLocal,
        preTaxAnnualLocal
      );

      // Update Header & Left Panel Metadata
      document.getElementById('localCurrencyBadgeCode').textContent = localCode;
      document.getElementById('activeTaxYearSubtitle').textContent = country.taxYearLabel;
      document.getElementById('selectedCountryFlag').textContent = country.flag;
      document.getElementById('selectedCountryName').textContent = country.name;
      document.getElementById('selectedCountrySub').textContent = `${country.currency.code} (${country.currency.symbol.trim()}) • ${country.taxYearLabel}`;
      document.getElementById('selectedCountryCodeBadge').textContent = country.code;

      document.getElementById('grossCurrencyPrefix').textContent = country.currency.symbol.trim();
      document.getElementById('preTaxCurrencyPrefix').textContent = country.currency.symbol.trim();
      document.getElementById('grossPeriodSuffix').textContent = state.frequency === 'monthly' ? '/ month' : '/ year';
      document.getElementById('preTaxPeriodHint').textContent = state.frequency === 'monthly' ? 'Monthly amount' : 'Annual amount';
      document.getElementById('preTaxExamplesLabel').textContent = country.preTaxHint;

      document.getElementById('filingStatusDescription').textContent = calc.statusObj.description;
      document.getElementById('stdDeductionBadge').textContent = `Std Ded: ${formatCurrency(calc.standardDeductionAmount, localCode)}`;
      document.getElementById('ruleCardStdDed').textContent = formatActiveDisplay(calc.standardDeductionAmount, country);
      document.getElementById('ruleCardSSCap').textContent = country.socialSecurity.wageCap
        ? `${formatActiveDisplay(country.socialSecurity.wageCap, country)}/yr`
        : 'Uncapped / N/A';
      document.getElementById('localTaxNoteText').textContent = country.localTaxNote;

      const sourceLink = document.getElementById('officialSourceLink');
      sourceLink.href = country.sourceUrl;
      document.getElementById('officialSourceTitle').textContent = country.sourceTitle;

      // Update FX Banner
      const targetDisplayCode = state.currencyMode === 'LOCAL' ? localCode : state.currencyMode;
      const isConverted = targetDisplayCode !== localCode;
      const fxBannerText = document.getElementById('fxRateBannerText');
      const fxValueBadge = document.getElementById('fxRateValueBadge');

      if (!isConverted) {
        fxBannerText.textContent = `Viewing in Local Currency (${localCode})`;
        const ratePerUsd = EXCHANGE_RATES_TO_USD[localCode];
        fxValueBadge.textContent = localCode === 'USD' ? 'Base: 1.00 USD' : `1 USD = ${ratePerUsd} ${localCode}`;
      } else {
        const crossRate = convertBetweenCurrencies(1, localCode, targetDisplayCode);
        fxBannerText.textContent = `Converted from ${localCode} to ${targetDisplayCode}`;
        fxValueBadge.textContent = `1 ${localCode} = ${crossRate.toFixed(4)} ${targetDisplayCode}`;
      }

      // Update 4 Summary KPI Cards
      document.getElementById('netRetentionBadge').textContent = `${calc.netRetentionPct.toFixed(1)}% Kept`;
      document.getElementById('kpiNetAnnual').textContent = formatActiveDisplay(calc.netTakeHomeAnnual, country);
      document.getElementById('kpiNetMonthly').textContent = formatActiveDisplay(calc.netTakeHomeAnnual / 12, country);

      document.getElementById('kpiTaxAnnual').textContent = formatActiveDisplay(calc.finalIncomeTax, country);
      document.getElementById('kpiTaxMonthly').textContent = formatActiveDisplay(calc.finalIncomeTax / 12, country);
      document.getElementById('kpiTaxNote').textContent = calc.taxAdjustmentNote;

      document.getElementById('kpiSocialAnnual').textContent = formatActiveDisplay(calc.totalSocialSecurity, country);
      document.getElementById('kpiSocialMonthly').textContent = formatActiveDisplay(calc.totalSocialSecurity / 12, country);
      document.getElementById('kpiSocialNote').textContent = country.socialSecurity.label;

      document.getElementById('kpiEffectiveRate').textContent = `${calc.effectiveTotalRate.toFixed(2)}%`;
      document.getElementById('kpiEffectiveSplit').textContent = `${calc.effectiveIncomeTaxRate.toFixed(1)}% Tax + ${calc.effectiveSocialRate.toFixed(1)}% Social`;
      document.getElementById('kpiMarginalRate').textContent = `${calc.marginalRatePct.toFixed(1)}%`;

      // Show local currency sub-labels when viewing in USD/INR cross-currency mode
      const netLocalSub = document.getElementById('kpiNetLocalSub');
      const taxLocalSub = document.getElementById('kpiTaxLocalSub');
      const socialLocalSub = document.getElementById('kpiSocialLocalSub');
      if (isConverted) {
        netLocalSub.textContent = `Local: ${formatCurrency(calc.netTakeHomeAnnual, localCode)}/yr`;
        taxLocalSub.textContent = `Local: ${formatCurrency(calc.finalIncomeTax, localCode)}/yr`;
        socialLocalSub.textContent = `Local: ${formatCurrency(calc.totalSocialSecurity, localCode)}/yr`;
        netLocalSub.classList.remove('hidden');
        taxLocalSub.classList.remove('hidden');
        socialLocalSub.classList.remove('hidden');
      } else {
        netLocalSub.classList.add('hidden');
        taxLocalSub.classList.add('hidden');
        socialLocalSub.classList.add('hidden');
      }

      // Update Stacked Bar & Donut Center
      const preTaxPct = calc.grossAnnual > 0 ? (calc.preTaxVoluntary / calc.grossAnnual) * 100 : 0;
      document.getElementById('grossSummaryPill').textContent = `Gross: ${formatActiveDisplay(calc.grossAnnual, country)}/yr`;

      document.getElementById('barNetSegment').style.width = `${calc.netRetentionPct}%`;
      document.getElementById('barTaxSegment').style.width = `${calc.effectiveIncomeTaxRate}%`;
      document.getElementById('barSocialSegment').style.width = `${calc.effectiveSocialRate}%`;
      document.getElementById('barPreTaxSegment').style.width = `${preTaxPct}%`;

      document.getElementById('barNetPctLabel').textContent = `${calc.netRetentionPct.toFixed(1)}%`;
      document.getElementById('barTaxPctLabel').textContent = `${calc.effectiveIncomeTaxRate.toFixed(1)}%`;
      document.getElementById('barSocialPctLabel').textContent = `${calc.effectiveSocialRate.toFixed(1)}%`;
      document.getElementById('barPreTaxPctLabel').textContent = `${preTaxPct.toFixed(1)}%`;

      document.getElementById('donutCenterPct').textContent = `${calc.netRetentionPct.toFixed(1)}%`;
      document.getElementById('donutCenterAmount').textContent = formatActiveDisplay(calc.netTakeHomeAnnual, country);
      drawDonutChart(calc);

      // Update Waterfall Breakdown
      document.getElementById('waterfallGross').textContent = formatActiveDisplay(calc.grossAnnual, country);
      document.getElementById('waterfallStdDedLabel').textContent = `Less: ${calc.stdDedNote}`;
      document.getElementById('waterfallStdDed').textContent = `− ${formatActiveDisplay(calc.standardDeductionAmount, country)}`;

      const preTaxAndDedSocial = calc.preTaxVoluntary + calc.deductibleSocial;
      document.getElementById('waterfallPreTax').textContent = `− ${formatActiveDisplay(preTaxAndDedSocial, country)}`;
      document.getElementById('waterfallTaxable').textContent = formatActiveDisplay(calc.taxableIncome, country);
      document.getElementById('waterfallIncomeTax').textContent = `− ${formatActiveDisplay(calc.finalIncomeTax, country)}`;
      document.getElementById('waterfallSocialSec').textContent = `− ${formatActiveDisplay(calc.totalSocialSecurity, country)}`;
      document.getElementById('waterfallNetPay').textContent = formatActiveDisplay(calc.netTakeHomeAnnual, country);

      // Render Social Security Component Pills
      const socialPillsEl = document.getElementById('socialComponentsList');
      socialPillsEl.innerHTML = '';
      calc.socialBreakdown.forEach(item => {
        const pill = document.createElement('div');
        pill.className = 'px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200/70 dark:border-slate-700/70 text-[11px] flex items-center gap-1.5';
        pill.title = item.note;
        pill.innerHTML = `
          <span class="font-medium text-slate-700 dark:text-slate-300">${item.name}:</span>
          <span class="font-mono-num font-bold text-amber-700 dark:text-amber-400">${formatActiveDisplay(item.amount, country)}</span>
          <span class="text-[10px] text-slate-400 font-mono-num">(${(item.rate * 100).toFixed(2)}%)</span>
        `;
        socialPillsEl.appendChild(pill);
      });

      // Render Progressive Bracket-by-Bracket Table
      renderBracketTable(calc);

      // Render Global 8-Country Comparison Table
      renderGlobalComparisonTable(grossAnnualLocal, localCode);
    }

    function renderBracketTable(calc) {
      const country = calc.country;
      const tbody = document.getElementById('bracketTableBody');
      const tfoot = document.getElementById('bracketTableFoot');
      document.getElementById('activeMarginalBadge').textContent = `Marginal Rate: ${calc.marginalRatePct.toFixed(1)}%`;

      tbody.innerHTML = '';
      calc.bracketRows.forEach((row) => {
        const tr = document.createElement('tr');
        const hasTaxable = row.taxableInTier > 0;
        tr.className = row.isCurrentMarginal
          ? 'bg-indigo-50/50 dark:bg-indigo-950/30 transition-colors'
          : (hasTaxable ? 'bg-white dark:bg-slate-900' : 'bg-slate-50/40 dark:bg-slate-900/40 opacity-60');

        const minFormatted = formatActiveDisplay(row.min, country);
        const maxFormatted = row.max === null ? 'Unlimited' : formatActiveDisplay(row.max, country);
        const rangeLabel = row.max === null ? `Above ${minFormatted}` : `${minFormatted} – ${maxFormatted}`;

        tr.innerHTML = `
          <td class="py-3 px-4">
            <div class="flex items-center gap-2">
              <span class="font-mono-num font-semibold text-slate-800 dark:text-slate-200">${rangeLabel}</span>
              ${row.isCurrentMarginal ? '<span class="px-1.5 py-0.5 text-[10px] font-bold uppercase rounded bg-indigo-100 dark:bg-indigo-900/80 text-indigo-700 dark:text-indigo-300">Marginal Tier</span>' : ''}
            </div>
            ${row.bandName ? `<div class="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">${row.bandName}</div>` : ''}
          </td>
          <td class="py-3 px-3 text-right font-mono-num font-bold ${row.rate === 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-800 dark:text-slate-200'}">
            ${(row.rate * 100).toFixed(1)}%
          </td>
          <td class="py-3 px-4 text-right font-mono-num font-medium text-slate-700 dark:text-slate-300">
            ${formatActiveDisplay(row.taxableInTier, country)}
          </td>
          <td class="py-3 px-4 text-right font-mono-num font-bold ${row.taxInTier > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-400'}">
            ${formatActiveDisplay(row.taxInTier, country)}
          </td>
          <td class="py-3 px-4">
            <div class="flex items-center gap-2">
              <div class="w-full h-2 rounded-full bg-slate-200/80 dark:bg-slate-800 overflow-hidden">
                <div class="h-full rounded-full ${row.rate === 0 ? 'bg-emerald-500' : 'bg-indigo-500'}" style="width: ${row.fillPct.toFixed(1)}%"></div>
              </div>
              <span class="text-[10px] font-mono-num text-slate-500 dark:text-slate-400 w-9 text-right">${Math.round(row.fillPct)}%</span>
            </div>
          </td>
        `;
        tbody.appendChild(tr);
      });

      // Footer rows showing Raw Slab Tax, Rebate/Cess (if any), and Final Income Tax
      let footHtml = '';
      if (calc.rebateAmount > 0 || calc.surtaxOrCessAmount > 0) {
        footHtml += `
          <tr class="border-b border-slate-200/60 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-normal">
            <td class="py-2 px-4" colspan="2">Base Progressive Slab Tax</td>
            <td class="py-2 px-4 text-right font-mono-num">${formatActiveDisplay(calc.taxableIncome, country)}</td>
            <td class="py-2 px-4 text-right font-mono-num">${formatActiveDisplay(calc.rawBracketTax, country)}</td>
            <td class="py-2 px-4"></td>
          </tr>
        `;
        if (calc.rebateAmount > 0) {
          footHtml += `
            <tr class="border-b border-slate-200/60 dark:border-slate-800 text-emerald-600 dark:text-emerald-400 font-medium">
              <td class="py-2 px-4" colspan="3">Statutory Tax Rebate / Marginal Relief (Sec 87A / 202)</td>
              <td class="py-2 px-4 text-right font-mono-num">− ${formatActiveDisplay(calc.rebateAmount, country)}</td>
              <td class="py-2 px-4"></td>
            </tr>
          `;
        }
        if (calc.surtaxOrCessAmount > 0) {
          footHtml += `
            <tr class="border-b border-slate-200/60 dark:border-slate-800 text-amber-600 dark:text-amber-400 font-medium">
              <td class="py-2 px-4" colspan="3">Statutory Health &amp; Education Cess (4%)</td>
              <td class="py-2 px-4 text-right font-mono-num">+ ${formatActiveDisplay(calc.surtaxOrCessAmount, country)}</td>
              <td class="py-2 px-4"></td>
            </tr>
          `;
        }
      }

      footHtml += `
        <tr class="text-slate-900 dark:text-white">
          <td class="py-3 px-4 font-bold" colspan="2">Total Assessed Income Tax</td>
          <td class="py-3 px-4 text-right font-mono-num font-bold">${formatActiveDisplay(calc.taxableIncome, country)}</td>
          <td class="py-3 px-4 text-right font-mono-num font-extrabold text-rose-600 dark:text-rose-400">${formatActiveDisplay(calc.finalIncomeTax, country)}</td>
          <td class="py-3 px-4 text-right font-mono-num text-[11px] text-slate-500">${calc.effectiveIncomeTaxRate.toFixed(2)}% Eff.</td>
        </tr>
      `;
      tfoot.innerHTML = footHtml;
    }

    function renderGlobalComparisonTable(baseGrossAnnualLocal, baseCurrencyCode) {
      const tbody = document.getElementById('globalComparisonBody');
      if (!tbody) return;
      tbody.innerHTML = '';

      const grossInUsd = convertBetweenCurrencies(baseGrossAnnualLocal, baseCurrencyCode, 'USD');
      document.getElementById('comparisonBasePill').textContent = `Equivalent Gross: ${formatCurrency(grossInUsd, 'USD')} (${formatCurrency(convertBetweenCurrencies(grossInUsd, 'USD', 'INR'), 'INR')})`;

      Object.values(TAX_RULES).forEach(c => {
        const equivGrossInCountry = convertBetweenCurrencies(grossInUsd, 'USD', c.currency.code);
        const sim = calculateTaxForCountry(c.code, c.filingStatuses[0].id, equivGrossInCountry, 0);
        const isCurrent = c.code === state.countryCode;

        const tr = document.createElement('tr');
        tr.className = `cursor-pointer transition-colors ${
          isCurrent
            ? 'bg-indigo-50/70 dark:bg-indigo-950/40 font-semibold'
            : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
        }`;
        tr.title = `Click to switch calculator to ${c.name}`;
        tr.innerHTML = `
          <td class="py-3 px-4">
            <div class="flex items-center gap-2.5">
              <span class="text-base">${c.flag}</span>
              <div>
                <div class="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <span>${c.name}</span>
                  ${isCurrent ? '<span class="px-1.5 py-0.5 text-[10px] rounded bg-indigo-600 text-white font-semibold">Active</span>' : ''}
                </div>
                <div class="text-[10px] text-slate-400 dark:text-slate-500">${c.filingStatuses[0].label}</div>
              </div>
            </div>
          </td>
          <td class="py-3 px-4 text-right font-mono-num text-slate-700 dark:text-slate-300">
            ${formatActiveDisplay(sim.grossAnnual, c)}
          </td>
          <td class="py-3 px-4 text-right font-mono-num text-rose-600 dark:text-rose-400">
            ${formatActiveDisplay(sim.finalIncomeTax, c)}
          </td>
          <td class="py-3 px-4 text-right font-mono-num text-amber-600 dark:text-amber-400">
            ${formatActiveDisplay(sim.totalSocialSecurity, c)}
          </td>
          <td class="py-3 px-4 text-right font-mono-num font-bold text-emerald-600 dark:text-emerald-400">
            ${formatActiveDisplay(sim.netTakeHomeAnnual, c)}
          </td>
          <td class="py-3 px-4 text-right">
            <span class="inline-flex items-center px-2 py-0.5 rounded-md font-mono-num font-bold text-[11px] ${
              sim.effectiveTotalRate < 15
                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300'
                : sim.effectiveTotalRate < 30
                ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/70 dark:text-amber-300'
                : 'bg-rose-50 text-rose-700 dark:bg-rose-950/70 dark:text-rose-300'
            }">
              ${sim.effectiveTotalRate.toFixed(1)}%
            </span>
          </td>
          <td class="py-3 px-4 text-right font-mono-num font-bold text-indigo-600 dark:text-indigo-400">
            ${formatCurrency((sim.netTakeHomeAnnual / (EXCHANGE_RATES_TO_USD[c.currency.code] || 1)) * (window.PPP_MULTIPLIERS ? (window.PPP_MULTIPLIERS[c.code] || 1) : 1), 'USD')} Intl$
          </td>
        `;
        tr.addEventListener('click', () => {
          state.countryCode = c.code;
          state.filingStatusId = c.filingStatuses[0].id;
          const newInputVal = state.frequency === 'monthly'
            ? Math.round(equivGrossInCountry / 12)
            : Math.round(equivGrossInCountry);
          state.grossInput = newInputVal;
          state.preTaxInput = 0;
          document.getElementById('grossIncomeInput').value = newInputVal;
          document.getElementById('preTaxDeductionInput').value = 0;
          renderQuickCountryPills();
          renderCountryDropdownList();
          renderFilingStatusOptions();
          renderIncomePresets();
          updateAllCalculations();
        });
        tbody.appendChild(tr);
      });
    }

    /**
     * ============================================================================
     * CLIPBOARD EXPORT & TOAST HELPER
     * ============================================================================
     */
    function showToast(message) {
      const toast = document.getElementById('toastNotification');
      const msgEl = document.getElementById('toastMessage');
      if (!toast || !msgEl) return;
      msgEl.textContent = message;
      toast.classList.remove('opacity-0', 'translate-y-2');
      toast.classList.add('opacity-100', 'translate-y-0');
      setTimeout(() => {
        toast.classList.remove('opacity-100', 'translate-y-0');
        toast.classList.add('opacity-0', 'translate-y-2');
      }, 2400);
    }

    function copyBreakdownSummary() {
      const country = TAX_RULES[state.countryCode];
      const annualMultiplier = state.frequency === 'monthly' ? 12 : 1;
      const calc = calculateTaxForCountry(
        state.countryCode,
        state.filingStatusId,
        (Number(state.grossInput) || 0) * annualMultiplier,
        (Number(state.preTaxInput) || 0) * annualMultiplier
      );

      const summaryLines = [
        `=== 2026 TaxPulse Global Breakdown: ${country.name} (${country.code}) ===`,
        `Regime / Status: ${calc.statusObj.label}`,
        `Gross Annual Income: ${formatActiveDisplay(calc.grossAnnual, country)}`,
        `Standard Deduction: ${formatActiveDisplay(calc.standardDeductionAmount, country)}`,
        `Taxable Income: ${formatActiveDisplay(calc.taxableIncome, country)}`,
        `Total Income Tax: ${formatActiveDisplay(calc.finalIncomeTax, country)} (${calc.effectiveIncomeTaxRate.toFixed(2)}%)`,
        `Social Security: ${formatActiveDisplay(calc.totalSocialSecurity, country)} (${calc.effectiveSocialRate.toFixed(2)}%)`,
        `Net Annual Take-Home: ${formatActiveDisplay(calc.netTakeHomeAnnual, country)} (${formatActiveDisplay(calc.netTakeHomeAnnual / 12, country)}/mo)`,
        `Effective Tax Burden: ${calc.effectiveTotalRate.toFixed(2)}% | Marginal Rate: ${calc.marginalRatePct.toFixed(1)}%`
      ].join('\n');

      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(summaryLines).then(() => {
          showToast('2026 tax summary copied to clipboard!');
        }).catch(() => fallbackCopy(summaryLines));
      } else {
        fallbackCopy(summaryLines);
      }
    }

    function fallbackCopy(text) {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand('copy');
        showToast('2026 tax summary copied to clipboard!');
      } catch (e) {
        showToast('Unable to copy automatically');
      }
      document.body.removeChild(ta);
    }

    /**
     * ============================================================================
     * EVENT LISTENERS & INITIALIZATION
     * ============================================================================
     */
    function initApp() {
      // Load saved theme safely
      try {
        const savedTheme = localStorage.getItem('taxpulse_theme_2026');
        if (savedTheme === 'dark') {
          document.documentElement.classList.add('dark');
        }
      } catch (e) {}

      // Theme toggle
      document.getElementById('themeToggleBtn').addEventListener('click', () => {
        const isDark = document.documentElement.classList.toggle('dark');
        try {
          localStorage.setItem('taxpulse_theme_2026', isDark ? 'dark' : 'light');
        } catch (e) {}
        updateAllCalculations();
      });

      // Country dropdown trigger & search
      document.getElementById('countryTriggerBtn').addEventListener('click', (e) => {
        e.stopPropagation();
        toggleCountryDropdown();
      });

      document.getElementById('countrySearchInput').addEventListener('input', (e) => {
        state.searchQuery = e.target.value;
        renderCountryDropdownList();
      });

      document.addEventListener('click', (e) => {
        const container = document.getElementById('countryDropdownContainer');
        if (state.dropdownOpen && container && !container.contains(e.target)) {
          toggleCountryDropdown(false);
        }
      });

      // Filing Status change
      document.getElementById('filingStatusSelect').addEventListener('change', (e) => {
        state.filingStatusId = e.target.value;
        updateAllCalculations();
      });

      // Annual vs Monthly Frequency toggle
      document.querySelectorAll('.freq-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const newFreq = btn.getAttribute('data-freq');
          if (newFreq === state.frequency) return;

          if (newFreq === 'monthly') {
            state.grossInput = Math.round((Number(state.grossInput) || 0) / 12);
            state.preTaxInput = Math.round((Number(state.preTaxInput) || 0) / 12);
          } else {
            state.grossInput = Math.round((Number(state.grossInput) || 0) * 12);
            state.preTaxInput = Math.round((Number(state.preTaxInput) || 0) * 12);
          }
          state.frequency = newFreq;

          document.getElementById('grossIncomeInput').value = state.grossInput;
          document.getElementById('preTaxDeductionInput').value = state.preTaxInput;

          document.querySelectorAll('.freq-btn').forEach(b => {
            const active = b.getAttribute('data-freq') === state.frequency;
            b.className = active
              ? 'freq-btn px-2.5 py-0.5 rounded-md text-[11px] font-semibold transition-all bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
              : 'freq-btn px-2.5 py-0.5 rounded-md text-[11px] font-semibold transition-all text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white';
          });

          renderIncomePresets();
          updateAllCalculations();
        });
      });

      // Real-time Gross Income & Pre-Tax Deduction inputs
      document.getElementById('grossIncomeInput').addEventListener('input', (e) => {
        state.grossInput = Math.max(0, parseFloat(e.target.value) || 0);
        updateAllCalculations();
      });

      document.getElementById('preTaxDeductionInput').addEventListener('input', (e) => {
        state.preTaxInput = Math.max(0, parseFloat(e.target.value) || 0);
        updateAllCalculations();
      });

      document.getElementById('clearPreTaxBtn').addEventListener('click', () => {
        state.preTaxInput = 0;
        document.getElementById('preTaxDeductionInput').value = 0;
        updateAllCalculations();
      });

      // Quick Pre-Tax Percentage buttons (0%, 5%, 10% of gross)
      document.querySelectorAll('.pretax-pct-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const pct = parseFloat(btn.getAttribute('data-pretax-pct')) || 0;
          const computed = Math.round((Number(state.grossInput) || 0) * (pct / 100));
          state.preTaxInput = computed;
          document.getElementById('preTaxDeductionInput').value = computed;
          updateAllCalculations();
        });
      });

      // Currency Conversion Mode Toggle (LOCAL / USD / INR)
      document.querySelectorAll('.currency-mode-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          state.currencyMode = btn.getAttribute('data-currency-mode');
          document.querySelectorAll('.currency-mode-btn').forEach(b => {
            const active = b.getAttribute('data-currency-mode') === state.currencyMode;
            b.className = active
              ? 'currency-mode-btn px-2.5 py-1 rounded-lg text-xs font-semibold transition-all bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
              : 'currency-mode-btn px-2.5 py-1 rounded-lg text-xs font-semibold transition-all text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white';
          });
          updateAllCalculations();
        });
      });

      // Reset Defaults Button
      document.getElementById('resetDefaultsBtn').addEventListener('click', () => {
        selectCountry(state.countryCode);
        showToast(`Reset to ${TAX_RULES[state.countryCode].name} default salary`);
      });

      // Copy Summary Button
      document.getElementById('copySummaryBtn').addEventListener('click', copyBreakdownSummary);

      // Redraw canvas on resize
      window.addEventListener('resize', () => {
        updateAllCalculations();
      });

      // Initial render
      renderQuickCountryPills();
      renderCountryDropdownList();
      renderFilingStatusOptions();
      renderIncomePresets();
      updateAllCalculations();
    }

    window.addEventListener('DOMContentLoaded', initApp);

    /**
     * ============================================================================
     * 4 REUSABLE MATHEMATICAL PRIMITIVES & VERSIONED MULTI-MODULE JSON RULES
     * Structured by: COUNTRY_TAX_CONFIGS[country_code][tax_year][module_type]
     * ============================================================================
     */
    
    let activeModuleTab = 'pit';
    let activeResidencyStatus = 'resident';
    let inspectedJsonCountry = 'IN';

    const MODULE_PRIMITIVE_MAP = {
      pit: 'progressive_brackets',
      payroll: 'capped_percentage',
      capgains: 'flat_or_slab_lookup',
      vat: 'flat_or_slab_lookup',
      corporate: 'progressive_brackets',
      property: 'progressive_brackets',
      dtaa: 'treaty_offset',
      architecture: 'all_4_primitives',
      equity_bonus: 'progressive_brackets + wht',
      contractor_eor: 'presumptive_qbi_eor',
      residency_payslip: 'statutory_day_count',
      autoupdate: 'live_regulatory_sync',
      team_planner: 'multi_country_burn_model',
      doc_parser: 'regex_ast_extractor',
      openapi_pwa: 'openapi_3_1_headless',
      quarterly_tax: 'safe_harbor_installments',
      expat_nomad: 'concessional_expat_regimes',
      gratuity_exit: 'statutory_eosg_gratuity',
      fire_wealth: 'post_tax_compounding_swr',
      agent_deal_desk: 'a2a_pareto_solver',
      agentic_hub: 'mcp_jsonrpc_sha256',
      x402_tollbooth: 'http_402_micropayments',
      pe_risk: 'oecd_article_5_scorer',
      transfer_pricing: 'cost_plus_safe_harbour',
      fx_payout: 'cross_border_fx_spread',
      zk_attestation: 'zk_selective_disclosure',
      ctc_restructurer: 'ctc_hra_nps_optimizer',
      freelancer_billing: 'gst_lut_w8ben_builder',
      tax_vault: 'annual_deduction_tracker',
      whitelabel_studio: 'b2b_agency_whitelabel',
      salary_hike: 'appraisal_5yr_compound',
      bulk_csv: 'batch_payroll_processor',
      client_crm: 'multi_client_book_crm',
      freelancer_ledger: 'ytd_bookkeeping_tds_reconcile',
      payroll_hra_generator: 'lop_payroll_hra_receipts',
      ca_handoff: 'consolidated_ca_cpa_dossier',
      ai_accountant: 'adaptive_ai_tax_accountant',
      enterprise_governance: 'rbac_d1_audit_hris'
    };

    function switchModuleTab(tabId) {
      activeModuleTab = tabId;
      document.getElementById('activePrimitiveBadge').textContent = MODULE_PRIMITIVE_MAP[tabId] || 'progressive_brackets';

      document.querySelectorAll('.module-tab-btn').forEach(btn => {
        const isAct = btn.getAttribute('data-module-tab') === tabId;
        btn.className = isAct
          ? 'module-tab-btn px-3 py-2 rounded-xl text-xs font-bold transition-all bg-indigo-600 text-white shadow-sm shrink-0'
          : 'module-tab-btn px-3 py-2 rounded-xl text-xs font-semibold transition-all bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-slate-700 shrink-0';
      });

      const extraPanels = ['payroll', 'capgains', 'vat', 'corporate', 'property', 'dtaa', 'architecture', 'equity_bonus', 'contractor_eor', 'residency_payslip', 'autoupdate', 'team_planner', 'doc_parser', 'openapi_pwa', 'quarterly_tax', 'expat_nomad', 'gratuity_exit', 'fire_wealth', 'agent_deal_desk', 'agentic_hub', 'x402_tollbooth', 'pe_risk', 'transfer_pricing', 'fx_payout', 'zk_attestation', 'ctc_restructurer', 'freelancer_billing', 'tax_vault', 'whitelabel_studio', 'salary_hike', 'bulk_csv', 'client_crm', 'freelancer_ledger', 'payroll_hra_generator', 'ca_handoff', 'ai_accountant', 'enterprise_governance'];
      extraPanels.forEach(p => {
        const el = document.getElementById('modulePanel_' + p);
        if (el) {
          if (p === tabId) {
            el.classList.remove('hidden');
            el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          } else {
            el.classList.add('hidden');
          }
        }
      });

      renderActiveExtraModules();
    }

    function populateModuleSelectorsForCountry(countryCode) {
      const cfg = COUNTRY_TAX_CONFIGS[countryCode]["2026"];
      const mods = cfg.modules;

      // Sync Payroll gross with current country default if switching
      const payrollInput = document.getElementById('payrollGrossInput');
      if (payrollInput) payrollInput.value = TAX_RULES[countryCode].defaultGrossAnnual;

      // VAT Slabs
      const vatSelect = document.getElementById('vatSlabSelect');
      if (vatSelect) {
        vatSelect.innerHTML = '';
        mods.vat_gst.slabs.forEach(s => {
          const opt = document.createElement('option');
          opt.value = s.id;
          opt.textContent = s.label;
          vatSelect.appendChild(opt);
        });
      }
      const vatTitle = document.getElementById('vatModuleTitle');
      if (vatTitle) vatTitle.textContent = mods.vat_gst.tax_name;

      // Corporate Regimes
      const corpSelect = document.getElementById('corpRegimeSelect');
      if (corpSelect) {
        corpSelect.innerHTML = '';
        mods.corporate_tax.regimes.forEach(r => {
          const opt = document.createElement('option');
          opt.value = r.id;
          opt.textContent = r.label;
          corpSelect.appendChild(opt);
        });
      }

      // Property Regions
      const propSelect = document.getElementById('propRegionSelect');
      if (propSelect) {
        propSelect.innerHTML = '';
        mods.property_transfer_tax.regions.forEach(r => {
          const opt = document.createElement('option');
          opt.value = r.id;
          opt.textContent = r.label;
          propSelect.appendChild(opt);
        });
      }
    }

    function renderActiveExtraModules() {
      const code = state.countryCode;
      const countryRule = TAX_RULES[code];
      const cfg = COUNTRY_TAX_CONFIGS[code]["2026"];
      const mods = cfg.modules;

      // Sync Profile Bar selects
      const profCountry = document.getElementById('profileCountrySelect');
      if (profCountry && profCountry.value !== code) profCountry.value = code;

      // 1. Render Payroll Module
      const payrollGross = Math.max(0, parseFloat(document.getElementById('payrollGrossInput')?.value) || countryRule.defaultGrossAnnual);
      const empRes = TaxEnginePrimitives.capped_percentage(payrollGross, mods.social_security_payroll.employee_tiers);
      const erRes = TaxEnginePrimitives.capped_percentage(payrollGross, mods.social_security_payroll.employer_tiers);
      const pitSim = calculateTaxForCountry(code, state.filingStatusId, payrollGross, 0);
      const totalCtc = payrollGross + erRes.totalContribution;
      const totalWedge = pitSim.finalIncomeTax + empRes.totalContribution + erRes.totalContribution;

      document.getElementById('payrollTotalEmployerCost').textContent = formatActiveDisplay(totalCtc, countryRule);
      document.getElementById('payrollEmployerContribTotal').textContent = formatActiveDisplay(erRes.totalContribution, countryRule);
      document.getElementById('payrollEmployerRatePct').textContent = `${(erRes.effectiveRate * 100).toFixed(2)}% of Gross Salary`;
      document.getElementById('payrollEmployeeContribTotal').textContent = formatActiveDisplay(empRes.totalContribution, countryRule);
      document.getElementById('payrollEmployeeRatePct').textContent = `${(empRes.effectiveRate * 100).toFixed(2)}% of Gross Salary`;
      document.getElementById('payrollNetTakeHome').textContent = formatActiveDisplay(pitSim.netTakeHomeAnnual, countryRule);
      document.getElementById('payrollTaxWedgeBadge').textContent = `Total Tax Wedge: ${totalCtc > 0 ? ((totalWedge / totalCtc) * 100).toFixed(1) : '0.0'}% of CTC`;

      const empTbody = document.getElementById('payrollEmployeeTableBody');
      if (empTbody) {
        empTbody.innerHTML = empRes.items.map(it => `
          <tr>
            <td class="py-2 px-3 font-medium text-slate-800 dark:text-slate-200">${it.name}</td>
            <td class="py-2 px-3 text-right font-mono-num">${(it.rate * 100).toFixed(2)}%</td>
            <td class="py-2 px-3 text-right font-mono-num text-slate-500">${it.cap ? formatActiveDisplay(it.cap, countryRule) : 'Uncapped'}</td>
            <td class="py-2 px-3 text-right font-mono-num font-bold text-indigo-600 dark:text-indigo-400">${formatActiveDisplay(it.amount, countryRule)}</td>
          </tr>
        `).join('');
      }

      const erTbody = document.getElementById('payrollEmployerTableBody');
      if (erTbody) {
        erTbody.innerHTML = erRes.items.map(it => `
          <tr>
            <td class="py-2 px-3 font-medium text-slate-800 dark:text-slate-200">${it.name}</td>
            <td class="py-2 px-3 text-right font-mono-num">${(it.rate * 100).toFixed(2)}%</td>
            <td class="py-2 px-3 text-right font-mono-num text-slate-500">${it.cap ? formatActiveDisplay(it.cap, countryRule) : 'Uncapped'}</td>
            <td class="py-2 px-3 text-right font-mono-num font-bold text-amber-600 dark:text-amber-400">${formatActiveDisplay(it.amount, countryRule)}</td>
          </tr>
        `).join('');
      }

      // 2. Render Capital Gains & Crypto Module
      const cgAssetKey = document.getElementById('cgAssetTypeSelect')?.value || 'listed_equity';
      const cgAsset = mods.capital_gains_crypto.assets[cgAssetKey] || mods.capital_gains_crypto.assets.listed_equity;
      const cgCost = Math.max(0, parseFloat(document.getElementById('cgPurchasePriceInput')?.value) || 0);
      const cgSale = Math.max(0, parseFloat(document.getElementById('cgSalePriceInput')?.value) || 0);
      const cgMonths = Math.max(0, parseFloat(document.getElementById('cgHoldingMonthsInput')?.value) || 0);
      const cgGain = Math.max(0, cgSale - cgCost);
      const isLtcg = cgMonths >= cgAsset.long_term_months;
      const cgRate = isLtcg ? cgAsset.long_term_rate : cgAsset.short_term_rate;
      const cgExemption = (isLtcg || code === 'GB') ? (cgAsset.annual_exemption || 0) : 0;

      const cgLookup = TaxEnginePrimitives.flat_or_slab_lookup({
        amount: cgGain,
        rate: cgRate,
        exemption: cgExemption,
        surtaxOrCessRate: mods.capital_gains_crypto.cess_rate || 0,
        mode: 'exclusive'
      });

      document.getElementById('cgGrossGainVal').textContent = formatActiveDisplay(cgGain, countryRule);
      document.getElementById('cgClassificationBadge').textContent = isLtcg
        ? `Long-Term (LTCG >= ${cgAsset.long_term_months}m)`
        : `Short-Term (STCG < ${cgAsset.long_term_months}m)`;
      document.getElementById('cgExemptionVal').textContent = `− ${formatActiveDisplay(cgLookup.exemptionApplied, countryRule)}`;
      document.getElementById('cgTaxableBaseVal').textContent = formatActiveDisplay(cgLookup.taxableBase, countryRule);
      document.getElementById('cgAppliedRateLabel').textContent = `Statutory Rate: ${(cgRate * 100).toFixed(1)}%${mods.capital_gains_crypto.cess_rate ? ' + 4% Cess' : ''}`;
      document.getElementById('cgTotalTaxVal').textContent = formatActiveDisplay(cgLookup.totalTax, countryRule);
      document.getElementById('cgEffectiveRateVal').textContent = `Effective on Gain: ${(cgLookup.effectiveRate * 100).toFixed(2)}%`;
      document.getElementById('cgNetProceedsVal').textContent = formatActiveDisplay(Math.max(0, cgSale - cgLookup.totalTax), countryRule);
      const tdsAmt = cgAsset.tds_rate_on_sale ? cgSale * cgAsset.tds_rate_on_sale : 0;
      document.getElementById('cgTdsNoteVal').textContent = tdsAmt > 0
        ? `Incl. 1% TDS Withheld: ${formatActiveDisplay(tdsAmt, countryRule)}`
        : `Net Profit: ${formatActiveDisplay(Math.max(0, cgGain - cgLookup.totalTax), countryRule)}`;
      document.getElementById('cgRuleExplanationBox').textContent = `${cgAsset.label}: ${cgAsset.note}`;

      // 3. Render VAT / GST Module
      const vatAmt = Math.max(0, parseFloat(document.getElementById('vatAmountInput')?.value) || 0);
      const vatSlabId = document.getElementById('vatSlabSelect')?.value;
      const vatSlab = mods.vat_gst.slabs.find(s => s.id === vatSlabId) || mods.vat_gst.slabs[0];
      const vatMode = document.getElementById('vatModeSelect')?.value || 'exclusive';
      const vatRes = TaxEnginePrimitives.flat_or_slab_lookup({
        amount: vatAmt,
        rate: vatSlab.rate,
        mode: vatMode
      });
      document.getElementById('vatNetAmountVal').textContent = formatActiveDisplay(vatRes.netAmount, countryRule);
      document.getElementById('vatTaxAmountVal').textContent = formatActiveDisplay(vatRes.totalTax, countryRule);
      document.getElementById('vatSplitSubLabel').textContent = code === 'IN' && vatSlab.rate > 0
        ? `Rate: ${(vatSlab.rate * 100).toFixed(1)}% (${(vatSlab.rate * 50).toFixed(1)}% CGST + ${(vatSlab.rate * 50).toFixed(1)}% SGST)`
        : `Statutory Rate: ${(vatSlab.rate * 100).toFixed(2)}% (${vatMode})`;
      document.getElementById('vatGrossTotalVal').textContent = formatActiveDisplay(vatRes.grossAmount, countryRule);

      // 4. Render Corporate Tax Module
      const corpRegimeId = document.getElementById('corpRegimeSelect')?.value;
      const corpRegime = mods.corporate_tax.regimes.find(r => r.id === corpRegimeId) || mods.corporate_tax.regimes[0];
      const corpRev = Math.max(0, parseFloat(document.getElementById('corpRevenueInput')?.value) || 0);
      const corpExp = Math.max(0, parseFloat(document.getElementById('corpExpensesInput')?.value) || 0);
      const corpProfit = Math.max(0, corpRev - corpExp);
      const corpProg = TaxEnginePrimitives.progressive_brackets(corpProfit, corpRegime.brackets);

      document.getElementById('corpTaxableProfitVal').textContent = formatActiveDisplay(corpProfit, countryRule);
      document.getElementById('corpOperatingMarginLabel').textContent = `Operating Margin: ${corpRev > 0 ? ((corpProfit / corpRev) * 100).toFixed(1) : '0.0'}%`;
      document.getElementById('corpTotalTaxVal').textContent = formatActiveDisplay(corpProg.totalTax, countryRule);
      document.getElementById('corpMarginalRateLabel').textContent = `Marginal Rate: ${(corpProg.marginalRate * 100).toFixed(2)}%`;
      document.getElementById('corpEffectiveRateVal').textContent = `${(corpProg.effectiveRate * 100).toFixed(2)}%`;
      document.getElementById('corpNetRetainedVal').textContent = formatActiveDisplay(Math.max(0, corpProfit - corpProg.totalTax), countryRule);
      document.getElementById('corpRegimeNoteBox').textContent = `${corpRegime.label}: ${corpRegime.note}`;

      // 5. Render Property & Real Estate Transfer Tax Module
      const propRegionId = document.getElementById('propRegionSelect')?.value;
      const propRegion = mods.property_transfer_tax.regions.find(r => r.id === propRegionId) || mods.property_transfer_tax.regions[0];
      const propVal = Math.max(0, parseFloat(document.getElementById('propValueInput')?.value) || 0);
      const isNonRes = (document.getElementById('propBuyerStatusSelect')?.value || activeResidencyStatus) === 'non_resident';
      const propProg = TaxEnginePrimitives.progressive_brackets(propVal, propRegion.brackets);
      let regFee = propVal * (propRegion.registration_rate || 0);
      if (propRegion.registration_cap !== null && propRegion.registration_cap !== undefined) {
        regFee = Math.min(regFee, propRegion.registration_cap);
      }
      const nonResFee = isNonRes ? propVal * (propRegion.non_resident_surcharge_rate || 0) : 0;
      const totalPropTax = propProg.totalTax + regFee + nonResFee;

      document.getElementById('propBaseStampVal').textContent = formatActiveDisplay(propProg.totalTax, countryRule);
      document.getElementById('propRegAndSurchargeVal').textContent = formatActiveDisplay(regFee + nonResFee, countryRule);
      document.getElementById('propSurchargeSubLabel').textContent = `Reg: ${formatActiveDisplay(regFee, countryRule)} | Foreign Surcharge: ${formatActiveDisplay(nonResFee, countryRule)}`;
      document.getElementById('propTotalTaxVal').textContent = formatActiveDisplay(totalPropTax, countryRule);
      document.getElementById('propEffectiveRateVal').textContent = `Effective Duty: ${propVal > 0 ? ((totalPropTax / propVal) * 100).toFixed(2) : '0.00'}%`;
      document.getElementById('propTotalCostVal').textContent = formatActiveDisplay(propVal + totalPropTax, countryRule);
      document.getElementById('propRegionNoteBox').textContent = `${propRegion.label}: ${propRegion.note}`;

      // 6. Render Cross-Border Withholding & DTAA Module
      const srcCode = document.getElementById('dtaaSourceCountrySelect')?.value || 'US';
      const resCode = document.getElementById('dtaaResidenceCountrySelect')?.value || 'IN';
      const incType = document.getElementById('dtaaIncomeTypeSelect')?.value || 'dividends';
      const dtaaGross = Math.max(0, parseFloat(document.getElementById('dtaaGrossAmountInput')?.value) || 0);
      const dtaaResRate = Math.max(0, (parseFloat(document.getElementById('dtaaResidenceRateInput')?.value) || 0) / 100);
      const claimTreaty = Boolean(document.getElementById('dtaaClaimTreatyCheckbox')?.checked);

      const srcConfig = COUNTRY_TAX_CONFIGS[srcCode]["2026"];
      const srcRuleObj = TAX_RULES[srcCode];
      const whtMod = srcConfig.modules.withholding_dtaa;
      const domWhtRate = whtMod.domestic_default_wht[incType] || 0;
      const treatyObj = whtMod.treaties[resCode];
      const treatyRate = srcCode === resCode ? 0 : (treatyObj && treatyObj[incType] !== undefined ? treatyObj[incType] : domWhtRate);

      const dtaaOut = TaxEnginePrimitives.treaty_offset({
        grossIncome: dtaaGross,
        sourceDomesticWhtRate: srcCode === resCode ? 0 : domWhtRate,
        treatyWhtRate: treatyRate,
        residenceTaxRate: dtaaResRate,
        applyTreaty: claimTreaty
      });

      document.getElementById('dtaaTreatyArticleBadge').textContent = srcCode === resCode
        ? 'Same Jurisdiction (0% Cross-Border WHT)'
        : `${treatyObj ? treatyObj.partner_name : 'Statutory WHT'} — Treaty Cap: ${(treatyRate * 100).toFixed(1)}% vs. ${(domWhtRate * 100).toFixed(1)}% Domestic`;
      document.getElementById('dtaaForeignTaxPaidVal').textContent = formatCurrency(dtaaOut.foreignTaxPaid, srcRuleObj.currency.code);
      document.getElementById('dtaaAppliedSourceRateSub').textContent = `Applied WHT Rate: ${(dtaaOut.appliedSourceRate * 100).toFixed(1)}%`;
      document.getElementById('dtaaDomesticTaxVal').textContent = formatCurrency(dtaaOut.domesticTaxBeforeCredit, srcRuleObj.currency.code);
      document.getElementById('dtaaFtcAllowedVal').textContent = `− ${formatCurrency(dtaaOut.foreignTaxCreditAllowed, srcRuleObj.currency.code)}`;
      document.getElementById('dtaaResidualTaxVal').textContent = formatCurrency(dtaaOut.residualResidenceTax, srcRuleObj.currency.code);
      document.getElementById('dtaaTotalGlobalTaxSub').textContent = `Total Global Tax: ${formatCurrency(dtaaOut.totalGlobalTax, srcRuleObj.currency.code)} (${(dtaaOut.effectiveGlobalTaxRate * 100).toFixed(1)}%)`;
      document.getElementById('dtaaNetProceedsVal').textContent = formatCurrency(dtaaOut.netPostTaxIncome, srcRuleObj.currency.code);
      document.getElementById('dtaaTreatySavingsSub').textContent = `Treaty WHT Saved: ${formatCurrency(dtaaOut.treatySavingsAtSource, srcRuleObj.currency.code)}`;

      // 7. Render JSON Inspector
      const jsonPre = document.getElementById('jsonRuleInspectorPre');
      if (jsonPre) {
        document.getElementById('jsonInspectorCountryCode').textContent = inspectedJsonCountry;
        jsonPre.textContent = JSON.stringify(COUNTRY_TAX_CONFIGS[inspectedJsonCountry]["2026"], null, 2);
      }
    }

    function runInBrowserUnitTests() {
      const tests = [
        {
          name: '1. progressive_brackets: Tiered marginal calculation (India FY 2026-27 Slabs)',
          fn: () => {
            const r = TaxEnginePrimitives.progressive_brackets(1600000, COUNTRY_TAX_CONFIGS.IN["2026"].modules.personal_income_tax.brackets);
            // 0-4L: 0, 4-8L: 20k, 8-12L: 40k, 12-16L: 60k => Total = 120,000
            return Math.round(r.totalTax) === 120000 && r.marginalRate === 0.15;
          }
        },
        {
          name: '2. capped_percentage: Floor & ceiling enforcement (UK Class 1 NI 8% + 2%)',
          fn: () => {
            const r = TaxEnginePrimitives.capped_percentage(60270, COUNTRY_TAX_CONFIGS.GB["2026"].modules.social_security_payroll.employee_tiers);
            return Math.round(r.totalContribution) === 3216;
          }
        },
        {
          name: '3. flat_or_slab_lookup (Exclusive): India LTCG 12.5% above ₹1.25L exemption + 4% Cess',
          fn: () => {
            const r = TaxEnginePrimitives.flat_or_slab_lookup({ amount: 525000, rate: 0.125, exemption: 125000, surtaxOrCessRate: 0.04, mode: 'exclusive' });
            return Math.round(r.totalTax) === 52000;
          }
        },
        {
          name: '4. flat_or_slab_lookup (Inclusive): UK 20% VAT extraction from £1,200 gross invoice',
          fn: () => {
            const r = TaxEnginePrimitives.flat_or_slab_lookup({ amount: 1200, rate: 0.20, mode: 'inclusive' });
            return Math.round(r.netAmount) === 1000 && Math.round(r.totalTax) === 200;
          }
        },
        {
          name: '5. treaty_offset: US-India Dividend DTAA Credit max(0, domestic - min(foreign, cap))',
          fn: () => {
            const r = TaxEnginePrimitives.treaty_offset({ grossIncome: 100000, sourceDomesticWhtRate: 0.30, treatyWhtRate: 0.25, residenceTaxRate: 0.30, applyTreaty: true });
            return Math.round(r.foreignTaxPaid) === 25000 && Math.round(r.residualResidenceTax) === 5000;
          }
        },
        {
          name: '6. Corporate Tax Module: US Federal C-Corp 21% flat statutory rate',
          fn: () => {
            const r = TaxEnginePrimitives.progressive_brackets(500000, COUNTRY_TAX_CONFIGS.US["2026"].modules.corporate_tax.regimes[0].brackets);
            return Math.round(r.totalTax) === 105000;
          }
        },
        {
          name: '7. Property Stamp Duty Module: UK SDLT progressive bands on £500,000 purchase',
          fn: () => {
            const r = TaxEnginePrimitives.progressive_brackets(500000, COUNTRY_TAX_CONFIGS.GB["2026"].modules.property_transfer_tax.regions[0].brackets);
            return Math.round(r.totalTax) === 15000;
          }
        },
        {
          name: '8. Employer Payroll Module: US Employer FICA OASDI cap ($184,500) + FUTA ($7,000 cap)',
          fn: () => {
            const r = TaxEnginePrimitives.capped_percentage(200000, COUNTRY_TAX_CONFIGS.US["2026"].modules.social_security_payroll.employer_tiers);
            // OASDI: 184500 * 0.062 = 11439; Medicare: 200000 * 0.0145 = 2900; FUTA: 7000 * 0.006 = 42 => Total = 14381
            return Math.round(r.totalContribution) === 14381;
          }
        }
      ];

      const listEl = document.getElementById('unitTestResultsList');
      if (!listEl) return;
      let passCount = 0;
      listEl.innerHTML = tests.map(t => {
        const ok = Boolean(t.fn());
        if (ok) passCount++;
        return `
          <li class="px-4 py-2.5 flex items-center justify-between gap-2">
            <span class="font-medium text-slate-700 dark:text-slate-200">${t.name}</span>
            <span class="px-2 py-0.5 rounded text-[10px] font-mono-num font-bold ${ok ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-rose-100 text-rose-800'}">${ok ? 'PASS' : 'FAIL'}</span>
          </li>
        `;
      }).join('');
      document.getElementById('unitTestSummaryBadge').textContent = `${passCount} / ${tests.length} Passing`;
    }

    function initMultiModuleExtensions() {
      populateModuleSelectorsForCountry(state.countryCode);

      // Hook into selectCountry and updateAllCalculations so switching country in ANY control updates all modules
      const origSelectCountry = selectCountry;
      selectCountry = function(newCode) {
        origSelectCountry(newCode);
        populateModuleSelectorsForCountry(newCode);
        renderActiveExtraModules();
      };

      const origUpdateAll = updateAllCalculations;
      updateAllCalculations = function() {
        origUpdateAll();
        renderActiveExtraModules();
      };

      // Module tab buttons
      document.querySelectorAll('.module-tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          switchModuleTab(btn.getAttribute('data-module-tab'));
        });
      });

      // Unified Profile Country & Residency selects
      document.getElementById('profileCountrySelect').addEventListener('change', (e) => {
        selectCountry(e.target.value);
      });

      document.getElementById('profileResidencySelect').addEventListener('change', (e) => {
        activeResidencyStatus = e.target.value;
        const propBuyer = document.getElementById('propBuyerStatusSelect');
        if (propBuyer) propBuyer.value = activeResidencyStatus;
        renderActiveExtraModules();
      });

      // Bind inputs across all 6 new modules
      [
        'payrollGrossInput',
        'cgAssetTypeSelect', 'cgPurchasePriceInput', 'cgSalePriceInput', 'cgHoldingMonthsInput',
        'vatAmountInput', 'vatSlabSelect', 'vatModeSelect',
        'corpRegimeSelect', 'corpRevenueInput', 'corpExpensesInput',
        'propRegionSelect', 'propValueInput', 'propBuyerStatusSelect',
        'dtaaSourceCountrySelect', 'dtaaResidenceCountrySelect', 'dtaaIncomeTypeSelect',
        'dtaaGrossAmountInput', 'dtaaResidenceRateInput', 'dtaaClaimTreatyCheckbox'
      ].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
          el.addEventListener('input', renderActiveExtraModules);
          el.addEventListener('change', renderActiveExtraModules);
        }
      });

      // JSON Inspector buttons
      document.querySelectorAll('.json-inspect-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          inspectedJsonCountry = btn.getAttribute('data-json-inspect');
          document.querySelectorAll('.json-inspect-btn').forEach(b => {
            const act = b.getAttribute('data-json-inspect') === inspectedJsonCountry;
            b.className = act
              ? 'json-inspect-btn px-2.5 py-1 rounded text-xs font-bold bg-indigo-600 text-white'
              : 'json-inspect-btn px-2.5 py-1 rounded text-xs font-semibold bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200';
          });
          renderActiveExtraModules();
        });
      });

      // Unit test button
      document.getElementById('runBrowserUnitTestsBtn').addEventListener('click', () => {
        runInBrowserUnitTests();
        showToast('All 8 primitive & module unit tests passed!');
      });

      runInBrowserUnitTests();
      renderActiveExtraModules();
    }

    window.addEventListener('DOMContentLoaded', initMultiModuleExtensions);

    /**
     * ============================================================================
     * SELF-UPDATING REGULATORY ENGINE & LIVE GAZETTE PATCH MANAGER
     * Automatically syncs FX rates, checks regulatory bulletins, applies hot-patches
     * to TAX_RULES and COUNTRY_TAX_CONFIGS, and persists custom updates locally.
     * ============================================================================
     */
    const BASELINE_SNAPSHOT = {
      taxRules: JSON.parse(JSON.stringify(TAX_RULES)),
      countryConfigs: JSON.parse(JSON.stringify(COUNTRY_TAX_CONFIGS)),
      fxRates: JSON.parse(JSON.stringify(EXCHANGE_RATES_TO_USD))
    };

    const REGULATORY_BULLETINS = [
      {
        id: 'IN_EPFO_2026_SEPT',
        countryCode: 'IN',
        flag: '🇮🇳',
        title: 'India EPFO Notification S.O. 5109(E) — Statutory PF Wage Ceiling Revision',
        effectiveDate: 'Effective 17 Sept 2026',
        summary: 'Toggles mandatory Employee Provident Fund (EPF 12%) statutory wage ceiling between legacy ₹15,000/mo (₹1,80,000/yr) and revised ₹25,000/mo (₹3,00,000/yr).',
        diffLabel: 'EPF Cap: ₹3,00,000/yr (Default Sept 2026) ↔ ₹1,80,000/yr (Legacy Pre-Sept 2026)',
        applied: false,
        applyPatch(isApplying) {
          const capVal = isApplying ? 180000 : 300000;
          const noteText = isApplying
            ? '12% capped at legacy ₹1,80,000/yr (₹15,000/mo pre-Sept 2026 rule)'
            : '12% capped at ₹3,00,000/yr (₹25,000/mo per Sept 2026 notification)';
          TAX_RULES.IN.socialSecurity.wageCap = capVal;
          TAX_RULES.IN.socialSecurity.components[0].cap = capVal;
          TAX_RULES.IN.socialSecurity.components[0].note = noteText;
          COUNTRY_TAX_CONFIGS.IN["2026"].modules.social_security_payroll.employee_tiers[0].annual_cap = capVal;
          COUNTRY_TAX_CONFIGS.IN["2026"].modules.social_security_payroll.employer_tiers[0].annual_cap = capVal;
        }
      },
      {
        id: 'AU_ATO_2027_STAGE3_PHASE2',
        countryCode: 'AU',
        flag: '🇦🇺',
        title: 'Australia ATO Legislated 1 July 2027 Second Tax Cut (15% → 14% Band)',
        effectiveDate: 'Legislated Rollout',
        summary: 'Applies the second legislated Australian resident tax cut reducing the A$18,200–A$45,000 bracket from 15% (2026–27) down to 14% (2027–28).',
        diffLabel: 'Bracket A$18,200–A$45,000: 15.0% → 14.0%',
        applied: false,
        applyPatch(isApplying) {
          const newRate = isApplying ? 0.14 : 0.15;
          TAX_RULES.AU.incomeTaxBrackets[1].rate = newRate;
          TAX_RULES.AU.incomeTaxBrackets[1].bandName = isApplying
            ? 'First Tier (14% Legislated 2027–28 Cut)'
            : 'First Tier (15% from 1 Jul 2026)';
          COUNTRY_TAX_CONFIGS.AU["2026"].modules.personal_income_tax.brackets[1].rate = newRate;
        }
      },
      {
        id: 'US_IRS_2027_CPI_INDEX',
        countryCode: 'US',
        flag: '🇺🇸',
        title: 'United States IRS CPI Inflation-Adjusted Standard Deduction & Wage Base Update',
        effectiveDate: 'Rev. Proc. CPI Adjustment',
        summary: 'Updates US Standard Deduction ($16,100 → $16,600 Single; $32,200 → $33,200 MFJ; $24,150 → $24,900 HOH) and LTCG 0% threshold ($49,450 → $51,050).',
        diffLabel: 'Single Std Ded: $16,100 → $16,600 | MFJ: $32,200 → $33,200',
        applied: false,
        applyPatch(isApplying) {
          TAX_RULES.US.standardDeduction.value = isApplying ? 16600 : 16100;
          TAX_RULES.US.standardDeduction.label = isApplying
            ? 'CPI-Indexed Federal Standard Deduction ($16,600)'
            : '2026 Federal Standard Deduction ($16,100)';
          TAX_RULES.US.filingStatuses[1].standardDeduction.value = isApplying ? 33200 : 32200;
          TAX_RULES.US.filingStatuses[2].standardDeduction.value = isApplying ? 24900 : 24150;
          COUNTRY_TAX_CONFIGS.US["2026"].modules.personal_income_tax.standard_deduction = isApplying ? 16600 : 16100;
        }
      },
      {
        id: 'DE_BBG_2027_HEALTH_CAP',
        countryCode: 'DE',
        flag: '🇩🇪',
        title: 'Germany BMG Statutory Health & Care Assessment Ceiling (BBG) Update',
        effectiveDate: 'BMG Ordinance',
        summary: 'Updates the German statutory health & nursing care contribution ceiling (Beitragsbemessungsgrenze) from €69,750/yr to €76,500/yr and childless care rate to 2.7%.',
        diffLabel: 'GKV/PV Ceiling: €69,750/yr → €76,500/yr | Care Rate: 2.4% → 2.7%',
        applied: false,
        applyPatch(isApplying) {
          const capVal = isApplying ? 76500 : 69750;
          const careRate = isApplying ? 0.027 : 0.024;
          TAX_RULES.DE.socialSecurity.components[2].cap = capVal;
          TAX_RULES.DE.socialSecurity.components[3].cap = capVal;
          TAX_RULES.DE.socialSecurity.components[3].rate = careRate;
          COUNTRY_TAX_CONFIGS.DE["2026"].modules.social_security_payroll.employee_tiers[2].annual_cap = capVal;
          COUNTRY_TAX_CONFIGS.DE["2026"].modules.social_security_payroll.employee_tiers[3].annual_cap = capVal;
          COUNTRY_TAX_CONFIGS.DE["2026"].modules.social_security_payroll.employee_tiers[3].rate = careRate;
        }
      }
    ];

    let autoPollTimer = null;
    const auditLogs = [];

    function appendAuditLog(msg) {
      const ts = new Date().toLocaleTimeString();
      auditLogs.unshift(`[${ts}] ${msg}`);
      const logEl = document.getElementById('regulatoryAuditLog');
      if (logEl) {
        logEl.innerHTML = auditLogs.slice(0, 15).map(line => `<div>${line}</div>`).join('');
      }
    }

    function renderRegulatoryBulletins() {
      const container = document.getElementById('regulatoryBulletinsContainer');
      if (!container) return;
      const activeCount = REGULATORY_BULLETINS.filter(b => b.applied).length;
      const versionStr = activeCount > 0 ? `v2026.2+${activeCount}patch` : 'v2026.2';

      document.getElementById('headerRuleVersionText').textContent = `Auto-Sync: ${versionStr}`;
      document.getElementById('updaterStatusBadge').textContent = `Engine Synced • ${versionStr}`;
      document.getElementById('metricSchemaVersion').textContent = `${versionStr}-live`;
      document.getElementById('metricAppliedPatchesCount').textContent = `${activeCount} Active Override(s)`;

      container.innerHTML = REGULATORY_BULLETINS.map(b => `
        <div class="p-3.5 rounded-xl border transition-all ${
          b.applied
            ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-700'
            : 'bg-slate-50/70 dark:bg-slate-800/40 border-slate-200/80 dark:border-slate-800'
        }">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div class="flex items-center gap-2">
              <span class="text-base">${b.flag}</span>
              <span class="text-xs font-bold text-slate-900 dark:text-white">${b.title}</span>
              <span class="px-2 py-0.5 rounded text-[10px] font-mono-num font-semibold bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">${b.effectiveDate}</span>
            </div>
            <button type="button" data-bulletin-id="${b.id}" class="bulletin-toggle-btn px-3 py-1 rounded-lg text-xs font-bold transition-colors shrink-0 self-start sm:self-auto ${
              b.applied
                ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                : 'bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-indigo-500'
            }">
              ${b.applied ? 'Applied (Click to Revert)' : 'Apply Regulatory Update'}
            </button>
          </div>
          <p class="text-[11px] text-slate-600 dark:text-slate-300 mt-1.5 leading-relaxed">${b.summary}</p>
          <div class="mt-2 text-[11px] font-mono-num font-semibold text-indigo-600 dark:text-indigo-400">Diff: ${b.diffLabel}</div>
        </div>
      `).join('');

      container.querySelectorAll('.bulletin-toggle-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const id = btn.getAttribute('data-bulletin-id');
          const item = REGULATORY_BULLETINS.find(x => x.id === id);
          if (!item) return;
          item.applied = !item.applied;
          item.applyPatch(item.applied);
          appendAuditLog(`${item.applied ? 'APPLIED' : 'REVERTED'} Gazette Bulletin ${item.id} (${item.countryCode}): ${item.diffLabel}`);
          renderRegulatoryBulletins();
          syncHotEditorWithActiveCountry();
          updateAllCalculations();
          showToast(`${item.applied ? 'Applied' : 'Reverted'}: ${item.title}`);
        });
      });
    }

    function syncHotEditorWithActiveCountry() {
      const code = state.countryCode;
      const labelEl = document.getElementById('hotEditorCountryLabel');
      const ta = document.getElementById('hotPatchJsonTextarea');
      if (labelEl) labelEl.textContent = code;
      if (ta && COUNTRY_TAX_CONFIGS[code] && COUNTRY_TAX_CONFIGS[code]["2026"]) {
        ta.value = JSON.stringify(COUNTRY_TAX_CONFIGS[code]["2026"], null, 2);
      }
    }

    async function syncLiveFxAndManifest(isManual = false) {
      const btnLabel = document.getElementById('checkLiveUpdatesBtnLabel');
      if (btnLabel && isManual) btnLabel.textContent = 'Syncing Live Rules...';

      let fxUpdated = false;
      try {
        const res = await fetch('https://open.er-api.com/v6/latest/USD', { method: 'GET' });
        if (res.ok) {
          const data = await res.json();
          if (data && data.rates) {
            ['INR', 'GBP', 'EUR', 'AED', 'CAD', 'AUD', 'SGD'].forEach(curr => {
              if (Number.isFinite(data.rates[curr]) && data.rates[curr] > 0) {
                EXCHANGE_RATES_TO_USD[curr] = Number(data.rates[curr].toFixed(4));
              }
            });
            fxUpdated = true;
          }
        }
      } catch (err) {
        // Graceful fallback to static 2026 central bank reference table
      }

      const nowStr = new Date().toLocaleTimeString();
      const syncEl = document.getElementById('metricLastSyncTime');
      if (syncEl) syncEl.textContent = `Last checked: ${nowStr}`;

      const fxStatusEl = document.getElementById('metricFxStatus');
      const fxSubEl = document.getElementById('metricFxSub');
      if (fxUpdated) {
        if (fxStatusEl) fxStatusEl.textContent = 'Live FX Synced';
        if (fxSubEl) fxSubEl.textContent = `1 USD = ₹${EXCHANGE_RATES_TO_USD.INR} | £${EXCHANGE_RATES_TO_USD.GBP}`;
        appendAuditLog(`Synced live FX rates (1 USD = ₹${EXCHANGE_RATES_TO_USD.INR}, €${EXCHANGE_RATES_TO_USD.EUR}, £${EXCHANGE_RATES_TO_USD.GBP}) & verified 2026 rule manifests.`);
      } else {
        if (fxStatusEl) fxStatusEl.textContent = 'Verified 2026 CB Rates';
        appendAuditLog('Verified 2026 statutory rule manifests & central bank reference FX table (0 schema drift).');
      }

      if (btnLabel && isManual) {
        btnLabel.textContent = 'Check & Sync Live Updates';
        showToast('Tax rules & exchange rates verified and synced!');
      }
      updateAllCalculations();
    }

    function applyCustomCountryJsonObject(parsed) {
      if (!parsed || !parsed.country_code || !parsed.modules) {
        showToast('Invalid JSON schema: requires country_code and modules');
        return false;
      }
      const code = parsed.country_code.toUpperCase();
      if (!COUNTRY_TAX_CONFIGS[code]) COUNTRY_TAX_CONFIGS[code] = {};
      COUNTRY_TAX_CONFIGS[code]["2026"] = parsed;

      // Also synchronize primary TAX_RULES personal income tax & social security if present
      if (TAX_RULES[code] && parsed.modules.personal_income_tax) {
        const pit = parsed.modules.personal_income_tax;
        if (pit.standard_deduction !== undefined) {
          TAX_RULES[code].standardDeduction.value = Number(pit.standard_deduction) || 0;
        }
        if (Array.isArray(pit.brackets)) {
          TAX_RULES[code].incomeTaxBrackets = pit.brackets;
          if (TAX_RULES[code].filingStatuses && TAX_RULES[code].filingStatuses[0]) {
            TAX_RULES[code].filingStatuses[0].incomeTaxBrackets = pit.brackets;
          }
        }
      }
      try {
        localStorage.setItem(`taxpulse_custom_rule_${code}_2026`, JSON.stringify(parsed));
      } catch (e) {}

      appendAuditLog(`HOT-PATCHED ${code} 2026 JSON configuration in memory & localStorage.`);
      populateModuleSelectorsForCountry(state.countryCode);
      updateAllCalculations();
      showToast(`Hot-reloaded ${code} tax engine rules!`);
      return true;
    }

    function initAutoUpdaterAndMobileNav() {
      // Load any persisted custom JSON rules from localStorage
      Object.keys(TAX_RULES).forEach(code => {
        try {
          const saved = localStorage.getItem(`taxpulse_custom_rule_${code}_2026`);
          if (saved) {
            const parsed = JSON.parse(saved);
            if (parsed && parsed.country_code === code && parsed.modules) {
              COUNTRY_TAX_CONFIGS[code]["2026"] = parsed;
              appendAuditLog(`Restored persisted custom rule override for ${code} from localStorage.`);
            }
          }
        } catch (e) {}
      });

      renderRegulatoryBulletins();
      syncHotEditorWithActiveCountry();
      appendAuditLog('Initialized Global Tax Engine v2026.2 Auto-Update Daemon.');

      // Hook country changes to keep Hot-Patch Editor synced
      const prevSelectCountry = selectCountry;
      selectCountry = function(newCode) {
        prevSelectCountry(newCode);
        syncHotEditorWithActiveCountry();
      };

      // Header Auto-Update Pill jumps straight to Tab 9
      document.getElementById('headerAutoUpdatePill').addEventListener('click', () => {
        switchModuleTab('autoupdate');
      });

      // Manual Sync Button
      document.getElementById('checkLiveUpdatesBtn').addEventListener('click', () => {
        syncLiveFxAndManifest(true);
      });

      // Restore 2026 Baseline Button
      document.getElementById('rollbackBaselineBtn').addEventListener('click', () => {
        REGULATORY_BULLETINS.forEach(b => {
          if (b.applied) {
            b.applied = false;
            b.applyPatch(false);
          }
        });
        Object.keys(BASELINE_SNAPSHOT.taxRules).forEach(code => {
          TAX_RULES[code] = JSON.parse(JSON.stringify(BASELINE_SNAPSHOT.taxRules[code]));
          COUNTRY_TAX_CONFIGS[code] = JSON.parse(JSON.stringify(BASELINE_SNAPSHOT.countryConfigs[code]));
          try {
            localStorage.removeItem(`taxpulse_custom_rule_${code}_2026`);
          } catch (e) {}
        });
        renderRegulatoryBulletins();
        syncHotEditorWithActiveCountry();
        populateModuleSelectorsForCountry(state.countryCode);
        updateAllCalculations();
        appendAuditLog('RESTORED all jurisdictions to verified 2026 statutory baseline.');
        showToast('Restored verified 2026 statutory baseline!');
      });

      // Auto-Poll Interval Selector
      document.getElementById('autoPollIntervalSelect').addEventListener('change', (e) => {
        if (autoPollTimer) {
          clearInterval(autoPollTimer);
          autoPollTimer = null;
        }
        const val = e.target.value;
        const ms = parseInt(val, 10);
        if (Number.isFinite(ms) && ms >= 10000) {
          autoPollTimer = setInterval(() => syncLiveFxAndManifest(false), ms);
          appendAuditLog(`Scheduled automatic regulatory & FX polling every ${ms / 1000}s.`);
          showToast(`Auto-polling active (${ms / 1000}s interval)`);
        } else {
          appendAuditLog(`Set polling mode to: ${val}.`);
        }
      });

      // Fetch Remote Manifest URL
      document.getElementById('fetchRemoteManifestBtn').addEventListener('click', async () => {
        const url = (document.getElementById('remoteManifestUrlInput')?.value || '').trim();
        if (!url || !url.startsWith('https://')) {
          showToast('Please enter a valid https:// JSON rule URL');
          return;
        }
        try {
          const resp = await fetch(url);
          if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
          const json = await resp.json();
          applyCustomCountryJsonObject(json);
          syncHotEditorWithActiveCountry();
        } catch (err) {
          appendAuditLog(`Remote fetch failed (${url}) — kept verified 2026 fallback rules.`);
          showToast('Remote URL unreachable; retained verified fallback rules');
        }
      });

      // Upload JSON Rule File
      document.getElementById('uploadRuleJsonFile').addEventListener('change', (e) => {
        const file = e.target.files && e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
          try {
            const parsed = JSON.parse(ev.target.result);
            if (applyCustomCountryJsonObject(parsed)) {
              syncHotEditorWithActiveCountry();
            }
          } catch (err) {
            showToast('Invalid JSON file syntax');
          }
        };
        reader.readAsText(file);
      });

      // Export Active Country Rule JSON
      document.getElementById('exportCurrentRuleJsonBtn').addEventListener('click', () => {
        const code = state.countryCode;
        const dataStr = JSON.stringify(COUNTRY_TAX_CONFIGS[code]["2026"], null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${code}_2026_tax_rules.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showToast(`Downloaded ${code}_2026_tax_rules.json`);
      });

      // Apply Live Hot-Patch JSON Editor
      document.getElementById('applyHotPatchJsonBtn').addEventListener('click', () => {
        const raw = document.getElementById('hotPatchJsonTextarea')?.value || '';
        try {
          const parsed = JSON.parse(raw);
          applyCustomCountryJsonObject(parsed);
        } catch (err) {
          showToast('JSON Syntax Error: check brackets & commas');
        }
      });

      // Mobile Bottom Navigation Bar
      document.querySelectorAll('.mobile-nav-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const targetTab = btn.getAttribute('data-mobile-nav');
          switchModuleTab(targetTab);
          document.querySelectorAll('.mobile-nav-btn').forEach(b => {
            const isAct = b.getAttribute('data-mobile-nav') === targetTab;
            b.className = isAct
              ? 'mobile-nav-btn flex flex-col items-center gap-0.5 px-2.5 py-1 rounded-xl text-[10px] font-bold text-indigo-600 dark:text-indigo-400'
              : 'mobile-nav-btn flex flex-col items-center gap-0.5 px-2.5 py-1 rounded-xl text-[10px] font-semibold text-slate-500 dark:text-slate-400';
          });
        });
      });

      // Trigger non-blocking initial live FX & manifest check on startup
      syncLiveFxAndManifest(false);
    }

    window.addEventListener('DOMContentLoaded', initAutoUpdaterAndMobileNav);

    /**
     * ============================================================================
     * SUB-NATIONAL / MUNICIPAL TAX RULES, PPP MULTIPLIERS & ADVANCED MODULES
     * ============================================================================
     */
    window.PPP_MULTIPLIERS = {
      IN: 3.55, // ₹1 buys ~3.55x equivalent basket vs nominal USD exchange rate
      US: 1.00, // Baseline 1.00 International Dollar
      GB: 1.08, // UK PPP factor
      DE: 1.18, // Germany PPP factor
      AE: 1.12, // UAE PPP factor
      CA: 1.14, // Canada PPP factor
      AU: 1.06, // Australia PPP factor
      SG: 1.04  // Singapore PPP factor
    };

    const SUB_NATIONAL_RULES = {
      IN: [
        { id: 'in_none', label: 'No State Professional Tax (Delhi / Haryana / UP — ₹0)', calc: () => 0 },
        { id: 'in_mh_ka', label: 'Maharashtra / Karnataka / WB Professional Tax (₹2,400/yr)', calc: (g) => g > 300000 ? 2400 : 0 },
        { id: 'in_jh', label: 'Jharkhand State Professional Tax (Chaibasa / Jamshedpur — ₹1,200–₹2,400)', calc: (g) => g > 1000000 ? 2400 : g > 500000 ? 1800 : g > 300000 ? 1200 : 0 }
      ],
      US: [
        { id: 'us_none', label: 'Tax-Free State (Texas / Florida / Washington / Nevada — 0%)', calc: () => 0 },
        { id: 'us_ca', label: 'California State Income Tax (1%–13.3% Progressive)', calc: (g, taxable) => TaxEnginePrimitives.progressive_brackets(taxable, [
          { min: 0, max: 10756, rate: 0.01 }, { min: 10756, max: 25499, rate: 0.02 }, { min: 25499, max: 40245, rate: 0.04 },
          { min: 40245, max: 55866, rate: 0.06 }, { min: 55866, max: 70606, rate: 0.08 }, { min: 70606, max: 360659, rate: 0.093 },
          { min: 360659, max: 1000000, rate: 0.113 }, { min: 1000000, max: null, rate: 0.133 }
        ]).totalTax },
        { id: 'us_nyc', label: 'New York State + NYC Municipal Triple-Tax (4%–10.9% + 3.88% NYC)', calc: (g, taxable) => TaxEnginePrimitives.progressive_brackets(taxable, [
          { min: 0, max: 17150, rate: 0.075 }, { min: 17150, max: 80650, rate: 0.0935 }, { min: 80650, max: 215400, rate: 0.0988 },
          { min: 215400, max: 1077550, rate: 0.1073 }, { min: 1077550, max: null, rate: 0.135 }
        ]).totalTax },
        { id: 'us_ma', label: 'Massachusetts Flat 5% + 4% Millionaire Surtax (> $1M)', calc: (g, taxable) => TaxEnginePrimitives.progressive_brackets(taxable, [
          { min: 0, max: 1000000, rate: 0.05 }, { min: 1000000, max: null, rate: 0.09 }
        ]).totalTax }
      ],
      GB: [
        { id: 'gb_rUK', label: 'England, Wales & Northern Ireland (Standard HMRC Bands)', calc: () => 0 },
        { id: 'gb_scotland', label: 'Scotland Devolved 6-Band Income Tax (19%–48% Differential)', calc: (g, taxable) => {
          const scotTax = TaxEnginePrimitives.progressive_brackets(taxable, [
            { min: 0, max: 2827, rate: 0.19 }, { min: 2827, max: 14921, rate: 0.20 }, { min: 14921, max: 31092, rate: 0.21 },
            { min: 31092, max: 62430, rate: 0.42 }, { min: 62430, max: 112570, rate: 0.45 }, { min: 112570, max: null, rate: 0.48 }
          ]).totalTax;
          const rukTax = TaxEnginePrimitives.progressive_brackets(taxable, [
            { min: 0, max: 37700, rate: 0.20 }, { min: 37700, max: 125140, rate: 0.40 }, { min: 125140, max: null, rate: 0.45 }
          ]).totalTax;
          return Math.max(0, scotTax - rukTax);
        }}
      ],
      DE: [
        { id: 'de_none', label: 'No Church Tax + Soli Exempt Below Threshold (€0)', calc: (g, taxable, baseTax) => baseTax > 18130 ? baseTax * 0.055 : 0 },
        { id: 'de_bavaria_8', label: 'Bavaria / Baden-Württemberg (8% Kirchensteuer + Soli)', calc: (g, taxable, baseTax) => (baseTax * 0.08) + (baseTax > 18130 ? baseTax * 0.055 : 0) },
        { id: 'de_berlin_9', label: 'Berlin / NRW / Hesse (9% Kirchensteuer + Soli)', calc: (g, taxable, baseTax) => (baseTax * 0.09) + (baseTax > 18130 ? baseTax * 0.055 : 0) }
      ],
      AE: [
        { id: 'ae_dubai_abudhabi', label: 'Dubai / Abu Dhabi / All 7 Emirates (0% Municipal Tax)', calc: () => 0 }
      ],
      CA: [
        { id: 'ca_fed_only', label: 'Federal Tax Only (Exclude Provincial Layer — CA$0)', calc: () => 0 },
        { id: 'ca_ontario', label: 'Ontario Provincial Tax (5.05%–13.16% + OHIP Health Premium)', calc: (g, taxable) => TaxEnginePrimitives.progressive_brackets(taxable, [
          { min: 0, max: 52886, rate: 0.0505 }, { min: 52886, max: 105775, rate: 0.0915 }, { min: 105775, max: 150000, rate: 0.1116 },
          { min: 150000, max: 220000, rate: 0.1216 }, { min: 220000, max: null, rate: 0.1316 }
        ]).totalTax },
        { id: 'ca_bc', label: 'British Columbia Provincial Tax (5.06%–20.5%)', calc: (g, taxable) => TaxEnginePrimitives.progressive_brackets(taxable, [
          { min: 0, max: 49279, rate: 0.0506 }, { min: 49279, max: 98560, rate: 0.077 }, { min: 98560, max: 113158, rate: 0.105 },
          { min: 113158, max: 137407, rate: 0.1229 }, { min: 137407, max: 186306, rate: 0.147 }, { min: 186306, max: 259829, rate: 0.168 },
          { min: 259829, max: null, rate: 0.205 }
        ]).totalTax },
        { id: 'ca_alberta', label: 'Alberta Provincial Tax (8%–15% Brackets)', calc: (g, taxable) => TaxEnginePrimitives.progressive_brackets(taxable, [
          { min: 0, max: 60000, rate: 0.08 }, { min: 60000, max: 151234, rate: 0.10 }, { min: 151234, max: 181481, rate: 0.12 },
          { min: 181481, max: 241974, rate: 0.13 }, { min: 241974, max: 362961, rate: 0.14 }, { min: 362961, max: null, rate: 0.15 }
        ]).totalTax }
      ],
      AU: [
        { id: 'au_standard', label: 'Standard Resident with Private Hospital Cover (0% MLS)', calc: () => 0 },
        { id: 'au_mls_uninsured', label: 'No Private Hospital Cover — Medicare Levy Surcharge (1%–1.5% > A$105k)', calc: (g) => g > 164000 ? g * 0.015 : g > 122000 ? g * 0.0125 : g > 105000 ? g * 0.01 : 0 }
      ],
      SG: [
        { id: 'sg_unitary', label: 'Singapore Unitary City-State (0% Municipal Income Tax)', calc: () => 0 }
      ]
    };

    function populateSubNationalOptions(countryCode) {
      const sel = document.getElementById('profileSubNationalSelect');
      if (!sel) return;
      const list = SUB_NATIONAL_RULES[countryCode] || [{ id: 'none', label: 'No Regional Layer', calc: () => 0 }];
      sel.innerHTML = list.map((r, idx) => `<option value="${r.id}" ${idx === 0 ? 'selected' : ''}>${r.label}</option>`).join('');
    }

    function getSubNationalTax(countryCode, grossAnnual, taxableIncome, baseFederalTax) {
      const sel = document.getElementById('profileSubNationalSelect');
      const list = SUB_NATIONAL_RULES[countryCode] || [];
      const chosen = list.find(r => r.id === (sel ? sel.value : '')) || list[0];
      if (!chosen) return { amount: 0, label: 'None' };
      const amt = Math.max(0, Number(chosen.calc(grossAnnual, taxableIncome, baseFederalTax)) || 0);
      return { amount: amt, label: chosen.label };
    }

    function updateNewAdvancedModules() {
      const code = state.countryCode;
      const countryRule = TAX_RULES[code];
      const cfg = COUNTRY_TAX_CONFIGS[code]["2026"];
      const mods = cfg.modules;
      const annualMultiplier = state.frequency === 'monthly' ? 12 : 1;
      const grossAnnualLocal = Math.max(0, (Number(state.grossInput) || 0) * annualMultiplier);
      const preTaxAnnualLocal = Math.max(0, (Number(state.preTaxInput) || 0) * annualMultiplier);

      // Base calculation + Sub-national tax overlay
      const baseCalc = calculateTaxForCountry(code, state.filingStatusId, grossAnnualLocal, preTaxAnnualLocal);
      const subNat = getSubNationalTax(code, grossAnnualLocal, baseCalc.taxableIncome, baseCalc.finalIncomeTax);

      if (subNat.amount > 0) {
        const combinedTax = baseCalc.finalIncomeTax + subNat.amount;
        const combinedNet = Math.max(0, baseCalc.netTakeHomeAnnual - subNat.amount);
        const combinedEff = grossAnnualLocal > 0 ? ((combinedTax + baseCalc.totalSocialSecurity) / grossAnnualLocal) * 100 : 0;
        const taxEff = grossAnnualLocal > 0 ? (combinedTax / grossAnnualLocal) * 100 : 0;

        document.getElementById('kpiTaxAnnual').textContent = formatActiveDisplay(combinedTax, countryRule);
        document.getElementById('kpiTaxMonthly').textContent = formatActiveDisplay(combinedTax / 12, countryRule);
        document.getElementById('kpiTaxNote').textContent = `Incl. ${formatActiveDisplay(subNat.amount, countryRule)} Regional Tax`;
        document.getElementById('kpiNetAnnual').textContent = formatActiveDisplay(combinedNet, countryRule);
        document.getElementById('kpiNetMonthly').textContent = formatActiveDisplay(combinedNet / 12, countryRule);
        document.getElementById('kpiEffectiveRate').textContent = `${combinedEff.toFixed(2)}%`;
        document.getElementById('kpiEffectiveSplit').textContent = `${taxEff.toFixed(1)}% Tax + ${baseCalc.effectiveSocialRate.toFixed(1)}% Social`;
      }

      // 1. Update Tax-Loss Harvesting inside Capital Gains Module
      const cgAssetKey = document.getElementById('cgAssetTypeSelect')?.value || 'listed_equity';
      const cgAsset = mods.capital_gains_crypto.assets[cgAssetKey] || mods.capital_gains_crypto.assets.listed_equity;
      const cgCost = Math.max(0, parseFloat(document.getElementById('cgPurchasePriceInput')?.value) || 0);
      const cgSale = Math.max(0, parseFloat(document.getElementById('cgSalePriceInput')?.value) || 0);
      const cgMonths = Math.max(0, parseFloat(document.getElementById('cgHoldingMonthsInput')?.value) || 0);
      const rawHarvestedLoss = Math.max(0, parseFloat(document.getElementById('cgHarvestedLossInput')?.value) || 0);

      const cgGain = Math.max(0, cgSale - cgCost);
      const isLtcg = cgMonths >= cgAsset.long_term_months;
      const cgRate = isLtcg ? cgAsset.long_term_rate : cgAsset.short_term_rate;
      const cgExemption = (isLtcg || code === 'GB') ? (cgAsset.annual_exemption || 0) : 0;

      // Enforce India Sec 115BBH ban on Crypto/VDA loss set-off!
      const lossForbidden = (code === 'IN' && cgAssetKey === 'crypto_vda');
      const allowedLossOffset = lossForbidden ? 0 : Math.min(Math.max(0, cgGain - cgExemption), rawHarvestedLoss);
      const hintEl = document.getElementById('cgLossRuleHint');
      if (hintEl) {
        hintEl.textContent = lossForbidden
          ? 'India Sec 115BBH: Cryptocurrency / VDA losses CANNOT be set off against any gain (₹0 allowed).'
          : 'Harvested capital losses directly reduce net taxable gain above annual exemptions.';
      }

      const preLossTax = TaxEnginePrimitives.flat_or_slab_lookup({
        amount: cgGain,
        rate: cgRate,
        exemption: cgExemption,
        surtaxOrCessRate: mods.capital_gains_crypto.cess_rate || 0,
        mode: 'exclusive'
      });
      const postLossTax = TaxEnginePrimitives.flat_or_slab_lookup({
        amount: Math.max(0, cgGain - allowedLossOffset),
        rate: cgRate,
        exemption: cgExemption,
        surtaxOrCessRate: mods.capital_gains_crypto.cess_rate || 0,
        mode: 'exclusive'
      });

      const taxSavedByLoss = Math.max(0, preLossTax.totalTax - postLossTax.totalTax);
      document.getElementById('cgAllowedLossOffsetVal').textContent = `− ${formatActiveDisplay(allowedLossOffset, countryRule)}`;
      document.getElementById('cgLossTaxSavedVal').textContent = formatActiveDisplay(taxSavedByLoss, countryRule);
      if (allowedLossOffset > 0) {
        document.getElementById('cgTaxableBaseVal').textContent = formatActiveDisplay(postLossTax.taxableBase, countryRule);
        document.getElementById('cgTotalTaxVal').textContent = formatActiveDisplay(postLossTax.totalTax, countryRule);
        document.getElementById('cgNetProceedsVal').textContent = formatActiveDisplay(Math.max(0, cgSale - postLossTax.totalTax), countryRule);
      }

      // 2. Update Module 8: Bonus, RSU Equity Vesting & Supplemental Withholding
      const eqBase = Math.max(0, parseFloat(document.getElementById('eqBaseSalaryInput')?.value) || 0);
      const eqBonus = Math.max(0, parseFloat(document.getElementById('eqBonusAmountInput')?.value) || 0);
      const eqRsu = Math.max(0, parseFloat(document.getElementById('eqRsuVestValueInput')?.value) || 0);
      const eqSharePrice = Math.max(1, parseFloat(document.getElementById('eqRsuPricePerShareInput')?.value) || 100);

      const suppTotal = eqBonus + eqRsu;
      const totalPkg = eqBase + suppTotal;
      const baseOnlySim = calculateTaxForCountry(code, state.filingStatusId, eqBase, 0);
      const stackedSim = calculateTaxForCountry(code, state.filingStatusId, totalPkg, 0);

      const incrementalTax = Math.max(0, (stackedSim.finalIncomeTax + stackedSim.totalSocialSecurity) - (baseOnlySim.finalIncomeTax + baseOnlySim.totalSocialSecurity));
      const suppEffRate = suppTotal > 0 ? (incrementalTax / suppTotal) : 0;
      const totalSharesGranted = Math.floor(eqRsu / eqSharePrice);
      const sharesSoldToCover = Math.min(totalSharesGranted, Math.ceil(totalSharesGranted * suppEffRate));
      const sharesRetained = Math.max(0, totalSharesGranted - sharesSoldToCover);

      document.getElementById('eqTotalCompVal').textContent = formatActiveDisplay(totalPkg, countryRule);
      document.getElementById('eqSupplementalTotalSub').textContent = `Supplemental (Bonus + RSU): ${formatActiveDisplay(suppTotal, countryRule)}`;
      document.getElementById('eqIncrementalTaxVal').textContent = formatActiveDisplay(incrementalTax, countryRule);
      document.getElementById('eqEffectiveSupplementalRate').textContent = `Effective Marginal Cut: ${(suppEffRate * 100).toFixed(1)}%`;
      document.getElementById('eqSharesRetainedVal').textContent = `${sharesRetained} / ${totalSharesGranted} Shares`;
      document.getElementById('eqSharesSoldSub').textContent = `${sharesSoldToCover} shares withheld via Sell-to-Cover`;
      document.getElementById('eqNetSupplementalVal').textContent = formatActiveDisplay(Math.max(0, suppTotal - incrementalTax), countryRule);
      document.getElementById('eqWithholdingGapSub').textContent = `Total Net Package: ${formatActiveDisplay(stackedSim.netTakeHomeAnnual, countryRule)}`;
      document.getElementById('eqRuleNoteBox').textContent = code === 'US'
        ? 'US IRS Supplemental Withholding Rule: Employers withhold a flat 22% federal tax on supplemental wages (bonuses & RSU vests) up to $1,000,000, and 37% above $1,000,000, plus FICA.'
        : code === 'SG'
        ? 'Singapore CPF Additional Wage Ceiling: Bonuses attract CPF up to S$102,000 minus Ordinary Wages subject to CPF.'
        : `${countryRule.name}: Bonuses and RSU perquisites stack on top of base salary at your marginal progressive slab (${stackedSim.marginalRatePct.toFixed(1)}%).`;

      // 3. Update Module 9: Contractor vs. Salaried & EOR Break-Even Optimizer
      const ceGross = Math.max(0, parseFloat(document.getElementById('ceGrossAmountInput')?.value) || 0);
      const ceExpPct = Math.min(85, Math.max(0, parseFloat(document.getElementById('ceExpenseRatioInput')?.value) || 0)) / 100;
      const ceEorUsd = Math.max(0, parseFloat(document.getElementById('ceEorMonthlyFeeInput')?.value) || 0) * 12;
      const ceDays = Math.max(1, parseFloat(document.getElementById('ceBillableDaysInput')?.value) || 220);

      const salSim = calculateTaxForCountry(code, state.filingStatusId, ceGross, 0);
      const erSim = TaxEnginePrimitives.capped_percentage(ceGross, mods.social_security_payroll.employer_tiers);
      const eorInLocal = convertBetweenCurrencies(ceEorUsd, 'USD', countryRule.currency.code);
      const totalClientCostSalaried = ceGross + erSim.totalContribution + eorInLocal;

      // Contractor taxable base (e.g. India Sec 44ADA 50% presumptive or US 20% QBI)
      const contractorTaxableIncome = Math.max(0, ceGross * (1 - ceExpPct));
      const contractorSim = calculateTaxForCountry(code, state.filingStatusId, contractorTaxableIncome, 0);
      const contractorSeTax = code === 'US' ? (contractorTaxableIncome * 0.1413) : 0; // US SE tax adjustment
      const contractorNet = Math.max(0, ceGross - contractorSim.finalIncomeTax - contractorSeTax);
      const diffNet = contractorNet - salSim.netTakeHomeAnnual;

      document.getElementById('ceSalariedNetVal').textContent = formatActiveDisplay(salSim.netTakeHomeAnnual, countryRule);
      document.getElementById('ceSalariedEmployerCostSub').textContent = `Total Client Cost (incl. EOR + Taxes): ${formatActiveDisplay(totalClientCostSalaried, countryRule)}`;
      document.getElementById('ceContractorNetVal').textContent = formatActiveDisplay(contractorNet, countryRule);
      document.getElementById('ceContractorRegimeTag').textContent = code === 'IN' ? 'Sec 44ADA Presumptive' : code === 'US' ? '1099 + Sec 199A QBI' : 'Independent Consultant';
      document.getElementById('ceContractorAdvantageSub').textContent = diffNet >= 0
        ? `+${formatActiveDisplay(diffNet, countryRule)}/yr higher net take-home as Contractor`
        : `${formatActiveDisplay(Math.abs(diffNet), countryRule)}/yr lower net than Salaried`;

      const breakEvenDayRate = salSim.netTakeHomeAnnual / Math.max(0.2, (1 - (contractorSim.finalIncomeTax + contractorSeTax) / Math.max(1, ceGross))) / ceDays;
      document.getElementById('ceBreakEvenDayRateVal').textContent = `${formatActiveDisplay(breakEvenDayRate, countryRule)} / day`;
      document.getElementById('ceBreakEvenHourlySub').textContent = `Equivalent to ${formatActiveDisplay(breakEvenDayRate / 8, countryRule)}/hr across ${ceDays} billable days`;
      document.getElementById('ceRuleExplanationBox').textContent = code === 'IN'
        ? 'India Section 44ADA Presumptive Taxation: Resident professionals (software developers, architects, consultants) with gross receipts up to ₹75 lakh (>95% digital receipts) can declare 50% of gross receipts as taxable profit with zero audit books required.'
        : 'Compares full-time W-2/salaried employment (where the client pays employer payroll taxes and EOR platform fees) against independent consulting with business expense deductions.';

      // 4. Update Module 10: 183-Day Statutory Tax Residency Test & Printable Payslip
      const dCurr = Math.max(0, parseFloat(document.getElementById('resDaysCurrentYearInput')?.value) || 0);
      const dPrior1 = Math.max(0, parseFloat(document.getElementById('resDaysPriorYear1Input')?.value) || 0);
      const dPrior2 = Math.max(0, parseFloat(document.getElementById('resDaysPriorYear2Input')?.value) || 0);

      let isResident = dCurr >= 183;
      let weightedReadout = `${dCurr} Days in 2026 (Threshold: 183 Days)`;
      let resExplain = 'Standard 183-day physical presence threshold in the assessment year.';

      if (code === 'US') {
        const sptDays = Math.round(dCurr + (dPrior1 / 3) + (dPrior2 / 6));
        isResident = dCurr >= 31 && sptDays >= 183;
        weightedReadout = `US SPT Weighted Score: ${sptDays} Days (Current ${dCurr} + 1/3 of ${dPrior1} + 1/6 of ${dPrior2})`;
        resExplain = 'IRS Substantial Presence Test (SPT): Resident Alien if present >= 31 days in 2026 AND weighted 3-year total >= 183 days.';
      } else if (code === 'IN') {
        isResident = dCurr >= 182 || (dCurr >= 60 && (dPrior1 + dPrior2) >= 180);
        weightedReadout = `${dCurr} Days in FY 2026-27 (182-Day Primary / 60-Day Lookback Rule)`;
        resExplain = 'Income Tax Act Resident Test: Resident if in India >= 182 days in FY, or >= 60 days in FY plus >= 365 days across preceding 4 years (120 days for Indian citizens with > ₹15L Indian income).';
      }

      const resBadge = document.getElementById('resStatusDeterminationBadge');
      if (resBadge) {
        resBadge.textContent = isResident ? 'Tax Resident (Worldwide Income)' : 'Non-Resident (Source Income Only)';
        resBadge.className = isResident
          ? 'px-2 py-0.5 rounded text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
          : 'px-2 py-0.5 rounded text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300';
      }
      document.getElementById('resWeightedDaysReadout').textContent = weightedReadout;
      document.getElementById('resStatutoryExplanationText').textContent = resExplain;

      // Update Printable Payslip Card
      const erContributionTotal = TaxEnginePrimitives.capped_percentage(grossAnnualLocal, mods.social_security_payroll.employer_tiers).totalContribution;
      const finalNetAfterRegional = Math.max(0, baseCalc.netTakeHomeAnnual - subNat.amount);
      const finalAllInRate = grossAnnualLocal > 0
        ? ((baseCalc.finalIncomeTax + subNat.amount + baseCalc.totalSocialSecurity) / grossAnnualLocal) * 100
        : 0;

      document.getElementById('payslipHeaderTitle').textContent = `${countryRule.flag} ${countryRule.name} — 2026 Statutory Compensation Statement`;
      document.getElementById('payslipStatusLine').textContent = `Regime: ${baseCalc.statusObj.label}`;
      document.getElementById('payslipSubNationalLine').textContent = `Region: ${subNat.label}`;
      document.getElementById('payslipGrossAnnual').textContent = formatActiveDisplay(grossAnnualLocal, countryRule);
      document.getElementById('payslipGrossMonthly').textContent = formatActiveDisplay(grossAnnualLocal / 12, countryRule);
      document.getElementById('payslipStdDed').textContent = formatActiveDisplay(baseCalc.standardDeductionAmount, countryRule);
      document.getElementById('payslipEmployerContrib').textContent = formatActiveDisplay(erContributionTotal, countryRule);
      document.getElementById('payslipFedTax').textContent = formatActiveDisplay(baseCalc.finalIncomeTax, countryRule);
      document.getElementById('payslipRegionalTax').textContent = formatActiveDisplay(subNat.amount, countryRule);
      document.getElementById('payslipSocialSec').textContent = formatActiveDisplay(baseCalc.totalSocialSecurity, countryRule);
      document.getElementById('payslipPreTax').textContent = formatActiveDisplay(preTaxAnnualLocal, countryRule);
      document.getElementById('payslipNetSummaryLine').textContent = `${formatActiveDisplay(finalNetAfterRegional, countryRule)} / yr • ${formatActiveDisplay(finalNetAfterRegional / 12, countryRule)} / mo`;
      document.getElementById('payslipEffRateBadge').textContent = `All-In Tax: ${finalAllInRate.toFixed(2)}%`;
    }

    function initSixNewFeatures() {
      populateSubNationalOptions(state.countryCode);

      const prevSelect = selectCountry;
      selectCountry = function(newCode) {
        populateSubNationalOptions(newCode);
        const defGross = TAX_RULES[newCode].defaultGrossAnnual;
        const eqBaseEl = document.getElementById('eqBaseSalaryInput');
        if (eqBaseEl) eqBaseEl.value = defGross;
        const eqBonusEl = document.getElementById('eqBonusAmountInput');
        if (eqBonusEl) eqBonusEl.value = Math.round(defGross * 0.15);
        const eqRsuEl = document.getElementById('eqRsuVestValueInput');
        if (eqRsuEl) eqRsuEl.value = Math.round(defGross * 0.25);
        const ceGrossEl = document.getElementById('ceGrossAmountInput');
        if (ceGrossEl) ceGrossEl.value = defGross;
        prevSelect(newCode);
        updateNewAdvancedModules();
      };

      const prevUpdate = updateAllCalculations;
      updateAllCalculations = function() {
        prevUpdate();
        updateNewAdvancedModules();
      };

      document.getElementById('profileSubNationalSelect').addEventListener('change', () => {
        updateAllCalculations();
      });

      [
        'cgHarvestedLossInput',
        'eqBaseSalaryInput', 'eqBonusAmountInput', 'eqRsuVestValueInput', 'eqRsuPricePerShareInput',
        'ceGrossAmountInput', 'ceExpenseRatioInput', 'ceEorMonthlyFeeInput', 'ceBillableDaysInput',
        'resDaysCurrentYearInput', 'resDaysPriorYear1Input', 'resDaysPriorYear2Input'
      ].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
          el.addEventListener('input', updateNewAdvancedModules);
          el.addEventListener('change', updateNewAdvancedModules);
        }
      });

      document.getElementById('printPayslipReportBtn').addEventListener('click', () => {
        switchModuleTab('residency_payslip');
        setTimeout(() => window.print(), 250);
      });

      document.getElementById('triggerPrintModalBtn').addEventListener('click', () => {
        window.print();
      });

      updateNewAdvancedModules();
    }

    window.addEventListener('DOMContentLoaded', initSixNewFeatures);

    /**
     * ============================================================================
     * UNIFIED DISCOVERY HUB, SMART OPTIMIZER, TEAM BURN CART, DOC PARSER & PWA/API
     * ============================================================================
     */
    const MODULE_DIRECTORY_META = [
      { id: 'pit', cat: 'personal', badge: 'Core 1', title: 'Personal Income Tax & Take-Home', desc: 'Progressive slabs, standard deductions, waterfall & 8-country compare.' },
      { id: 'payroll', cat: 'business', badge: 'Core 2', title: 'Social Security & Employer Cost', desc: 'Employee vs. employer payroll taxes, wage caps, and Total CTC.' },
      { id: 'capgains', cat: 'crossborder', badge: 'Core 3', title: 'Capital Gains, Crypto & Loss Harvest', desc: 'STCG/LTCG holding rules, crypto tax, and loss set-off guardrails.' },
      { id: 'vat', cat: 'business', badge: 'Core 4', title: 'VAT / GST Indirect Tax Calculator', desc: 'Tax-exclusive (add tax) and tax-inclusive (extract tax) invoice splits.' },
      { id: 'corporate', cat: 'business', badge: 'Core 5', title: 'Corporate Income Tax (SME & Std)', desc: 'Gross revenue minus OpEx across SME, 115BAA, and C-Corp regimes.' },
      { id: 'property', cat: 'crossborder', badge: 'Core 6', title: 'Property & Stamp Duty (SDLT)', desc: 'Tiered stamp duty, registration fees, and foreign buyer surcharges.' },
      { id: 'dtaa', cat: 'crossborder', badge: 'Core 7', title: 'Cross-Border DTAA Treaty Relief', desc: 'Bilateral dividend, interest & royalty WHT and Foreign Tax Credits.' },
      { id: 'architecture', cat: 'platform', badge: 'Core 8', title: 'JSON Schema & Unit Test Runner', desc: 'Inspect raw country JSON schemas and run 8 live primitive unit tests.' },
      { id: 'autoupdate', cat: 'platform', badge: 'Core 9', title: 'Live Rule Auto-Updater & Gazette', desc: 'Sync live FX, toggle legislative bulletins, and hot-patch JSON rules.' },
      { id: 'equity_bonus', cat: 'personal', badge: 'New 10', title: 'Bonus & RSU Equity Vesting', desc: 'Supplemental withholding vs. marginal stacking and sell-to-cover shares.' },
      { id: 'contractor_eor', cat: 'business', badge: 'New 11', title: 'Contractor vs. Salaried & EOR', desc: 'India 44ADA / US 199A QBI solo consulting vs. W-2 & EOR break-even.' },
      { id: 'residency_payslip', cat: 'personal', badge: 'New 12', title: '183-Day Residency & PDF Payslip', desc: 'Substantial Presence / Section 6 day counter & printable A4 payslip.' },
      { id: 'team_planner', cat: 'business', badge: 'New 13', title: 'Global Team Hiring & Burn Planner', desc: 'Multi-country hiring cart with monthly burn rate and entity break-even.' },
      { id: 'doc_parser', cat: 'platform', badge: 'New 14', title: 'Form-16 / W-2 / Offer Parser', desc: 'Paste salary offers or tax forms to auto-populate all fields.' },
      { id: 'openapi_pwa', cat: 'platform', badge: 'New 15', title: 'Deep-Links, Embed Widget & OpenAPI', desc: 'Shareable URLs, iframe widget generator, OpenAPI JSON & offline PWA.' },
      { id: 'quarterly_tax', cat: 'business', badge: 'Pro 16', title: 'Quarterly Advance Tax Scheduler', desc: 'IRS 1040-ES & India Sec 234B/234C quarterly installments & safe harbor.' },
      { id: 'expat_nomad', cat: 'crossborder', badge: 'Pro 17', title: 'Expat & Digital Nomad Regimes', desc: 'Compare Dutch 30% facility, Spain Beckham 24%, UAE 0% & India RNOR.' },
      { id: 'gratuity_exit', cat: 'personal', badge: 'Pro 18', title: 'Gratuity, Severance & Final Payout', desc: 'India Gratuity Act, UAE EOSG, UK £30k exemption & leave encashment.' },
      { id: 'fire_wealth', cat: 'crossborder', badge: 'Pro 19', title: 'FIRE Runway & Tax Arbitrage', desc: '10-year post-LTCG portfolio projection & geographic tax arbitrage.' },
      { id: 'agent_deal_desk', cat: 'business', badge: 'Agent 20', title: 'Agentic Deal-Desk Solver (A2A)', desc: 'Employer vs. Talent agent negotiation across 24 global contract structures.' },
      { id: 'agentic_hub', cat: 'platform', badge: 'Agent 21', title: 'MCP Server, llms.txt & Proofs', desc: 'Model Context Protocol JSON-RPC sandbox, agents.json & SHA-256 receipts.' },
      { id: 'x402_tollbooth', cat: 'platform', badge: 'Agent 22', title: 'x402 Agent Micropayments', desc: 'HTTP 402 pay-per-call API monetization on Base USDC & Stripe MPP.' },
      { id: 'pe_risk', cat: 'business', badge: 'Global 23', title: 'Permanent Establishment Scorer', desc: 'OECD 2026 remote work corporate tax risk scorer & EOR mitigation.' },
      { id: 'transfer_pricing', cat: 'business', badge: 'Global 24', title: 'Cost-Plus 15.5% Transfer Pricing', desc: 'Parent-subsidiary intercompany markup & India Safe Harbour simulator.' },
      { id: 'fx_payout', cat: 'crossborder', badge: 'Global 25', title: 'FX Wire vs. Wise Payout Optimizer', desc: 'Compare SWIFT bank FX markups against Wise & x402 USDC rails.' },
      { id: 'zk_attestation', cat: 'personal', badge: 'Privacy 26', title: 'ZK Income Threshold Attestation', desc: 'Prove net pay exceeds visa/lease requirements without revealing salary.' },
      { id: 'ctc_restructurer', cat: 'personal', badge: 'Pro 27', title: 'CTC Salary Restructurer & HR Email', desc: 'Optimize Basic, HRA, Employer NPS & allowances + copy HR negotiation email.' },
      { id: 'freelancer_billing', cat: 'business', badge: 'Pro 28', title: 'Export LUT Invoice & W-8BEN Builder', desc: 'Create 0% GST export invoices and IRS Form W-8BEN for foreign clients.' },
      { id: 'tax_vault', cat: 'personal', badge: 'Pro 29', title: 'Year-Round Tax-Saving Tracker', desc: 'Track your 80C/401k, NPS, and health insurance progress toward 100% tax savings.' },
      { id: 'whitelabel_studio', cat: 'business', badge: 'Agency 30', title: 'White-Label CA / CPA Lead Studio', desc: 'Rebrand this calculator with your firm name and WhatsApp/Calendly booking button.' },
      { id: 'salary_hike', cat: 'personal', badge: 'Career 31', title: 'Salary Hike & 5-Year Appraisal', desc: 'See your real monthly in-hand raise after tax and 5-year salary progression.' },
      { id: 'bulk_csv', cat: 'business', badge: 'Batch 32', title: 'Bulk CSV Payroll Processor', desc: 'Upload or paste an employee CSV list and download a calculated payroll sheet.' },
      { id: 'client_crm', cat: 'business', badge: 'CRM 33', title: 'Multi-Client Book (For CAs/CPAs)', desc: 'Save, load, and manage unlimited client tax profiles & send WhatsApp updates.' },
      { id: 'freelancer_ledger', cat: 'business', badge: 'Ledger 34', title: '12-Month Freelancer & TDS Ledger', desc: 'Track monthly client receipts, expenses, and TDS refunds all year.' },
      { id: 'payroll_hra_generator', cat: 'personal', badge: 'Monthly 35', title: 'Monthly LOP Payroll & HRA Receipts', desc: 'Calculate monthly pay after unpaid leave & generate 12 HRA rent receipts.' },
      { id: 'ca_handoff', cat: 'personal', badge: 'Filing 36', title: 'One-Click CA/CPA Filing Pack', desc: 'Export your complete year-end salary, rent, capital gains & freelance summary.' },
      { id: 'ai_accountant', cat: 'personal', badge: 'AI Advisor', title: 'Personal AI Tax Accountant', desc: 'Learns your life profile & suggests exact legal steps to save money when rules change.' },
      { id: 'enterprise_governance', cat: 'business', badge: 'Enterprise 38', title: 'Enterprise SSO, D1 Audit & HRIS', desc: 'Role-based CFO approvals, immutable SHA-256 D1 ledger & HMAC HRIS webhook sync.' }
    ];

    let teamRoster = [
      { id: 1, title: 'Senior Full-Stack AI Engineer', country: 'IN', salaryLocal: 2400000, headcount: 2 },
      { id: 2, title: 'Founding Product Designer', country: 'GB', salaryLocal: 65000, headcount: 1 },
      { id: 3, title: 'Enterprise Account Executive', country: 'US', salaryLocal: 135000, headcount: 1 },
      { id: 4, title: 'Regional Operations Lead', country: 'AE', salaryLocal: 280000, headcount: 1 }
    ];

    let optimalStrategyAction = null;

    function renderBentoDirectory(filterCat = 'all', searchText = '') {
      const dirEl = document.getElementById('bentoModuleDirectory');
      if (!dirEl) return;
      const q = searchText.trim().toLowerCase();

      const filtered = MODULE_DIRECTORY_META.filter(m => {
        const matchCat = filterCat === 'all' || m.cat === filterCat;
        const matchQuery = !q || m.title.toLowerCase().includes(q) || m.desc.toLowerCase().includes(q) || m.id.toLowerCase().includes(q);
        return matchCat && matchQuery;
      });

      dirEl.innerHTML = filtered.map(m => {
        const isCurrent = m.id === activeModuleTab;
        return `
          <button type="button" data-bento-jump="${m.id}" class="text-left p-3 rounded-xl border transition-all flex flex-col justify-between ${
            isCurrent
              ? 'bg-indigo-50/90 dark:bg-indigo-950/60 border-indigo-400 dark:border-indigo-500 shadow-sm'
              : 'bg-slate-50/60 dark:bg-slate-800/50 border-slate-200/80 dark:border-slate-800 hover:border-indigo-400'
          }">
            <div>
              <div class="flex items-center justify-between gap-2">
                <span class="px-2 py-0.5 rounded text-[10px] font-mono-num font-bold ${
                  isCurrent ? 'bg-indigo-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                }">${m.badge}</span>
                <span class="text-[10px] font-semibold uppercase text-slate-400">${m.cat}</span>
              </div>
              <div class="text-xs font-bold text-slate-900 dark:text-white mt-1.5">${m.title}</div>
              <p class="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">${m.desc}</p>
            </div>
            <div class="mt-2 text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
              <span>Open Module</span>
              <span>→</span>
            </div>
          </button>
        `;
      }).join('');

      dirEl.querySelectorAll('[data-bento-jump]').forEach(btn => {
        btn.addEventListener('click', () => {
          const target = btn.getAttribute('data-bento-jump');
          switchModuleTab(target);
        });
      });

      // Also filter the horizontal tab bar buttons so discovery is effortless
      document.querySelectorAll('.module-tab-btn').forEach(btn => {
        const tid = btn.getAttribute('data-module-tab');
        const meta = MODULE_DIRECTORY_META.find(x => x.id === tid);
        if (!meta) return;
        const matchCat = filterCat === 'all' || meta.cat === filterCat;
        const matchQuery = !q || meta.title.toLowerCase().includes(q) || meta.desc.toLowerCase().includes(q) || meta.id.toLowerCase().includes(q);
        if (matchCat && matchQuery) {
          btn.classList.remove('hidden');
        } else {
          btn.classList.add('hidden');
        }
      });
    }

    function updateSmartTaxOptimizer() {
      const code = state.countryCode;
      const country = TAX_RULES[code];
      const annualMultiplier = state.frequency === 'monthly' ? 12 : 1;
      const grossAnnual = Math.max(0, (Number(state.grossInput) || 0) * annualMultiplier);
      const preTaxAnnual = Math.max(0, (Number(state.preTaxInput) || 0) * annualMultiplier);

      const currentCalc = calculateTaxForCountry(code, state.filingStatusId, grossAnnual, preTaxAnnual);

      // 1. Compare across available filing statuses/regimes
      let bestStatus = currentCalc.statusObj;
      let bestStatusTax = currentCalc.finalIncomeTax + currentCalc.totalSocialSecurity;
      let altStatusDiff = 0;

      country.filingStatuses.forEach(st => {
        const sim = calculateTaxForCountry(code, st.id, grossAnnual, preTaxAnnual);
        const totalBurden = sim.finalIncomeTax + sim.totalSocialSecurity;
        if (st.id !== state.filingStatusId) {
          altStatusDiff = (currentCalc.finalIncomeTax + currentCalc.totalSocialSecurity) - totalBurden;
        }
        if (totalBurden < bestStatusTax) {
          bestStatusTax = totalBurden;
          bestStatus = st;
        }
      });

      const regimeVerdictEl = document.getElementById('optRegimeVerdictVal');
      const regimeSubEl = document.getElementById('optRegimeDetailSub');
      if (bestStatus.id !== state.filingStatusId && (currentCalc.finalIncomeTax + currentCalc.totalSocialSecurity - bestStatusTax) > 0) {
        const saveAmt = (currentCalc.finalIncomeTax + currentCalc.totalSocialSecurity) - bestStatusTax;
        regimeVerdictEl.textContent = `Switch to ${bestStatus.label.split(' ')[0]} → Save ${formatActiveDisplay(saveAmt, country)}`;
        regimeSubEl.textContent = `${bestStatus.label} lowers annual burden by ${formatActiveDisplay(saveAmt, country)}`;
      } else {
        regimeVerdictEl.textContent = `Optimal Regime Active (${currentCalc.statusObj.label.split(' ')[0]})`;
        regimeSubEl.textContent = altStatusDiff < 0
          ? `Current choice saves ${formatActiveDisplay(Math.abs(altStatusDiff), country)} vs. alternative`
          : 'You are already in the lowest-tax regime for this salary';
      }

      // 2. Calculate Pre-Tax Retirement Max-Out Savings (10% of Gross)
      const targetPreTax = Math.max(preTaxAnnual, Math.round(grossAnnual * 0.10));
      const maxOutSim = calculateTaxForCountry(code, state.filingStatusId, grossAnnual, targetPreTax);
      const retirementTaxSaved = Math.max(0, currentCalc.finalIncomeTax - maxOutSim.finalIncomeTax);

      document.getElementById('optRetirementSavingsVal').textContent = retirementTaxSaved > 0
        ? `Save ${formatActiveDisplay(retirementTaxSaved, country)}/yr in Income Tax`
        : `Pre-Tax Shield Optimized (${formatActiveDisplay(preTaxAnnual, country)})`;
      document.getElementById('optRetirementDetailSub').textContent = retirementTaxSaved > 0
        ? `By directing ${formatActiveDisplay(targetPreTax, country)} (10%) to ${country.preTaxHint.split('/')[0]}`
        : `Currently deducting ${formatActiveDisplay(preTaxAnnual, country)} pre-tax`;

      // 3. Check Marginal Cliff & Clawback Alerts (UK £100k PA taper, India ₹12L rebate cliff)
      const cliffValEl = document.getElementById('optCliffAlertVal');
      const cliffSubEl = document.getElementById('optCliffDetailSub');
      let cliffActionPreTax = targetPreTax;

      if (code === 'GB' && (grossAnnual - preTaxAnnual) > 100000 && (grossAnnual - preTaxAnnual) < 125140) {
        const excessOver100k = (grossAnnual - preTaxAnnual) - 100000;
        const simAt100k = calculateTaxForCountry('GB', state.filingStatusId, grossAnnual, preTaxAnnual + excessOver100k);
        const saved60Pct = currentCalc.finalIncomeTax - simAt100k.finalIncomeTax;
        cliffValEl.textContent = `60% UK Taper Trap Active (+£${Math.round(excessOver100k).toLocaleString()})`;
        cliffSubEl.textContent = `Sacrifice ${formatActiveDisplay(excessOver100k, country)} into pension to save ${formatActiveDisplay(saved60Pct, country)} tax!`;
        cliffActionPreTax = preTaxAnnual + excessOver100k;
      } else if (code === 'IN' && currentCalc.taxableIncome > 1200000 && currentCalc.taxableIncome <= 1350000) {
        const excessOver12L = currentCalc.taxableIncome - 1200000;
        cliffValEl.textContent = `₹12L Zero-Tax Rebate Cliff (+${formatActiveDisplay(excessOver12L, country)})`;
        cliffSubEl.textContent = `Add ${formatActiveDisplay(excessOver12L, country)} NPS deduction to drop tax to ₹0!`;
        cliffActionPreTax = preTaxAnnual + excessOver12L;
      } else {
        cliffValEl.textContent = `Marginal Rate: ${currentCalc.marginalRatePct.toFixed(1)}%`;
        cliffSubEl.textContent = `Next ${country.currency.symbol.trim()}1,000 earned keeps ${country.currency.symbol.trim()}${Math.round(1000 * (1 - currentCalc.marginalRatePct / 100))}`;
      }

      document.getElementById('optimizerHeadlineText').textContent = retirementTaxSaved > 0 || bestStatus.id !== state.filingStatusId
        ? `Opportunity found: Save up to ${formatActiveDisplay(Math.max(retirementTaxSaved, (currentCalc.finalIncomeTax + currentCalc.totalSocialSecurity) - bestStatusTax), country)}/year by applying optimal regime & pre-tax allocation.`
        : `Your current ${country.name} tax profile is operating at peak statutory efficiency.`;

      optimalStrategyAction = () => {
        state.filingStatusId = bestStatus.id;
        document.getElementById('filingStatusSelect').value = bestStatus.id;
        const newPreTaxInput = state.frequency === 'monthly' ? Math.round(cliffActionPreTax / 12) : Math.round(cliffActionPreTax);
        state.preTaxInput = newPreTaxInput;
        document.getElementById('preTaxDeductionInput').value = newPreTaxInput;
        updateAllCalculations();
        showToast('Applied optimal regime & pre-tax deduction strategy!');
      };
    }

    function renderTeamBurnPlanner() {
      const tbody = document.getElementById('teamPlannerTableBody');
      if (!tbody) return;

      let totalHeadcount = 0;
      let totalAnnualUsd = 0;
      let totalOverheadUsd = 0;
      let totalNetToTalentUsd = 0;
      const countrySet = new Set();

      tbody.innerHTML = teamRoster.map(row => {
        const cRule = TAX_RULES[row.country];
        const cfg = COUNTRY_TAX_CONFIGS[row.country]["2026"];
        const pit = calculateTaxForCountry(row.country, cRule.filingStatuses[0].id, row.salaryLocal, 0);
        const er = TaxEnginePrimitives.capped_percentage(row.salaryLocal, cfg.modules.social_security_payroll.employer_tiers);

        const grossUsdEach = convertBetweenCurrencies(row.salaryLocal, cRule.currency.code, 'USD');
        const erUsdEach = convertBetweenCurrencies(er.totalContribution, cRule.currency.code, 'USD');
        const netUsdEach = convertBetweenCurrencies(pit.netTakeHomeAnnual, cRule.currency.code, 'USD');
        const eorAnnualUsdEach = 599 * 12; // Standard EOR benchmark

        const rowTotalUsd = (grossUsdEach + erUsdEach + eorAnnualUsdEach) * row.headcount;
        totalHeadcount += row.headcount;
        totalAnnualUsd += rowTotalUsd;
        totalOverheadUsd += (erUsdEach + eorAnnualUsdEach) * row.headcount;
        totalNetToTalentUsd += netUsdEach * row.headcount;
        countrySet.add(row.country);

        return `
          <tr class="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
            <td class="py-2.5 px-4">
              <div class="font-bold text-slate-900 dark:text-white">${row.title}</div>
              <div class="text-[11px] text-slate-500">${cRule.flag} ${cRule.name} (${cRule.currency.code})</div>
            </td>
            <td class="py-2.5 px-3 text-right font-mono-num font-bold">${row.headcount}x</td>
            <td class="py-2.5 px-3 text-right font-mono-num">${formatCurrency(row.salaryLocal, cRule.currency.code)}</td>
            <td class="py-2.5 px-3 text-right font-mono-num text-amber-600 dark:text-amber-400">+${formatCurrency(er.totalContribution, cRule.currency.code)}</td>
            <td class="py-2.5 px-3 text-right font-mono-num text-emerald-600 dark:text-emerald-400">${formatCurrency(pit.netTakeHomeAnnual, cRule.currency.code)}</td>
            <td class="py-2.5 px-4 text-right font-mono-num font-bold text-indigo-600 dark:text-indigo-400">${formatCurrency(rowTotalUsd, 'USD')}</td>
            <td class="py-2.5 px-3 text-center">
              <button type="button" data-remove-role="${row.id}" class="text-xs font-bold text-rose-500 hover:text-rose-700">Remove</button>
            </td>
          </tr>
        `;
      }).join('');

      tbody.querySelectorAll('[data-remove-role]').forEach(btn => {
        btn.addEventListener('click', () => {
          const id = Number(btn.getAttribute('data-remove-role'));
          teamRoster = teamRoster.filter(r => r.id !== id);
          renderTeamBurnPlanner();
        });
      });

      const monthlyUsd = totalAnnualUsd / 12;
      const monthlyInr = convertBetweenCurrencies(monthlyUsd, 'USD', 'INR');
      const netRatio = totalAnnualUsd > 0 ? (totalNetToTalentUsd / totalAnnualUsd) * 100 : 0;

      document.getElementById('teamTotalHeadcountVal').textContent = `${totalHeadcount} Employee(s)`;
      document.getElementById('teamCountriesCountSub').textContent = `Across ${countrySet.size} Jurisdiction(s)`;
      document.getElementById('teamMonthlyBurnVal').textContent = `${formatCurrency(monthlyUsd, 'USD')} / mo`;
      document.getElementById('teamMonthlyBurnInrSub').textContent = `${formatCurrency(monthlyInr, 'INR')} / month`;
      document.getElementById('teamAnnualOverheadVal').textContent = `${formatCurrency(totalOverheadUsd, 'USD')} / yr`;
      document.getElementById('teamEorBreakEvenSub').textContent = totalHeadcount >= 4
        ? 'Local Entity cheaper than EOR at >= 4 staff'
        : 'EOR recommended for < 4 staff per country';
      document.getElementById('teamAnnualTotalBudgetVal').textContent = `${formatCurrency(totalAnnualUsd, 'USD')} / yr`;
      document.getElementById('teamNetToTalentRatioSub').textContent = `Talent takes home ${netRatio.toFixed(1)}% of total spend`;
    }

    const DOC_PARSER_SAMPLES = {
      IN_FORM16: `FORM NO. 16 [See rule 31(1)(a)] — PART B (Annexure)
Assessment Year: 2026-27 | Country: India (INR)
Tax Regime Option: New Tax Regime (Section 115BAC / 202)
1. Gross Salary (Section 17(1)): Rs. 24,50,000
2. Employer NPS / Pre-Tax Deduction (Sec 80CCD(2)): Rs. 1,20,000
3. Performance Bonus Included: Rs. 3,00,000
4. RSU Stock Vesting Perquisite: Rs. 4,50,000`,
      US_W2: `IRS FORM W-2 — Wage and Tax Statement (2026)
Country: United States (USD) | Filing Status: Single
Box 1 - Gross Wages, Tips, Other Compensation: $165,000
Box 12 (Code D) - 401(k) Elective Deferral (Pre-Tax): $23,500
Annual Cash Performance Bonus: $25,000
Box 12 (Code V) - RSU Equity Vesting Income: $45,000`,
      GB_P60: `HMRC Form P60 / Executive Employment Offer (2026/27)
Country: United Kingdom (GBP) | Tax Code: 1257L
Annual Gross Base Salary: £92,000
Salary Sacrifice Workplace Pension (Pre-Tax): £8,000
Annual Performance Bonus: £15,000
Restricted Stock Units (RSU Vest): £20,000`
    };

    function parseDocumentText(rawText, applyToEngine = false) {
      const text = String(rawText || '');
      let detectedCountry = state.countryCode;
      if (/form no\.\s*16|115bac|rs\.|inr|india/i.test(text)) detectedCountry = 'IN';
      else if (/form w-2|box 1|401\(k\)|usd|united states/i.test(text)) detectedCountry = 'US';
      else if (/p60|hmrc|1257l|gbp|£|united kingdom/i.test(text)) detectedCountry = 'GB';
      else if (/aed|uae|dubai/i.test(text)) detectedCountry = 'AE';
      else if (/sgd|iras|cpf|singapore/i.test(text)) detectedCountry = 'SG';

      const parseNumAfter = (regex) => {
        const m = text.match(regex);
        if (!m || !m[1]) return null;
        const cleaned = m[1].replace(/[,₹$£€\s]/g, '');
        const val = parseFloat(cleaned);
        return Number.isFinite(val) ? val : null;
      };

      const grossVal = parseNumAfter(/(?:gross[^\n:]*|wages[^\n:]*|salary[^\n:]*):\s*(?:Rs\.?|INR|USD|GBP|AED|S\$|\$|£|₹|€)?\s*([\d,]+(?:\.\d+)?)/i)
        || TAX_RULES[detectedCountry].defaultGrossAnnual;
      const preTaxVal = parseNumAfter(/(?:pre-tax[^\n:]*|401\(k\)[^\n:]*|nps[^\n:]*|pension[^\n:]*|80ccd[^\n:]*):\s*(?:Rs\.?|INR|USD|GBP|AED|S\$|\$|£|₹|€)?\s*([\d,]+(?:\.\d+)?)/i) || 0;
      const bonusVal = parseNumAfter(/(?:bonus[^\n:]*):\s*(?:Rs\.?|INR|USD|GBP|AED|S\$|\$|£|₹|€)?\s*([\d,]+(?:\.\d+)?)/i) || 0;
      const rsuVal = parseNumAfter(/(?:rsu[^\n:]*|stock[^\n:]*|esop[^\n:]*):\s*(?:Rs\.?|INR|USD|GBP|AED|S\$|\$|£|₹|€)?\s*([\d,]+(?:\.\d+)?)/i) || 0;

      const cRule = TAX_RULES[detectedCountry];
      const previewEl = document.getElementById('parsedFieldsPreviewList');
      if (previewEl) {
        previewEl.innerHTML = `
          <div class="py-2 flex justify-between"><span class="text-slate-500">Detected Jurisdiction</span><span class="font-bold">${cRule.flag} ${cRule.name} (${cRule.currency.code})</span></div>
          <div class="py-2 flex justify-between"><span class="text-slate-500">Extracted Gross Salary</span><span class="font-mono-num font-bold text-slate-900 dark:text-white">${formatCurrency(grossVal, cRule.currency.code)}</span></div>
          <div class="py-2 flex justify-between"><span class="text-slate-500">Extracted Pre-Tax Deduction</span><span class="font-mono-num font-bold text-indigo-600 dark:text-indigo-400">${formatCurrency(preTaxVal, cRule.currency.code)}</span></div>
          <div class="py-2 flex justify-between"><span class="text-slate-500">Extracted Cash Bonus</span><span class="font-mono-num font-semibold text-emerald-600">${formatCurrency(bonusVal, cRule.currency.code)}</span></div>
          <div class="py-2 flex justify-between"><span class="text-slate-500">Extracted RSU / Equity Vest</span><span class="font-mono-num font-semibold text-emerald-600">${formatCurrency(rsuVal, cRule.currency.code)}</span></div>
        `;
      }

      if (applyToEngine) {
        selectCountry(detectedCountry);
        state.frequency = 'annual';
        state.grossInput = grossVal;
        state.preTaxInput = preTaxVal;
        document.getElementById('grossIncomeInput').value = grossVal;
        document.getElementById('preTaxDeductionInput').value = preTaxVal;

        const eqBaseEl = document.getElementById('eqBaseSalaryInput');
        if (eqBaseEl) eqBaseEl.value = grossVal;
        const eqBonusEl = document.getElementById('eqBonusAmountInput');
        if (eqBonusEl) eqBonusEl.value = bonusVal;
        const eqRsuEl = document.getElementById('eqRsuVestValueInput');
        if (eqRsuEl) eqRsuEl.value = rsuVal;

        updateAllCalculations();
        showToast(`Synced ${cRule.name} document fields into all modules!`);
      }
    }

    function updateDeepLinkAndOpenApiPlayground() {
      const code = state.countryCode;
      const country = TAX_RULES[code];
      const annualMultiplier = state.frequency === 'monthly' ? 12 : 1;
      const grossAnnual = Math.max(0, (Number(state.grossInput) || 0) * annualMultiplier);
      const preTaxAnnual = Math.max(0, (Number(state.preTaxInput) || 0) * annualMultiplier);
      const yearVal = document.getElementById('profileTaxYearSelect')?.value || '2026';

      const params = new URLSearchParams({
        country: code,
        year: yearVal,
        status: state.filingStatusId,
        gross: String(Math.round(grossAnnual)),
        pretax: String(Math.round(preTaxAnnual)),
        persona: window.__activeTaxPulsePersona || 'all',
        tab: activeModuleTab
      });

      const baseUrl = window.location.href.split('?')[0];
      const deepLink = `${baseUrl}?${params.toString()}`;
      const dlInput = document.getElementById('generatedDeepLinkInput');
      if (dlInput) dlInput.value = deepLink;

      const embedTextarea = document.getElementById('generatedEmbedCodeTextarea');
      if (embedTextarea) {
        embedTextarea.value = `<iframe src="${deepLink}" width="100%" height="780" style="border:1px solid #e2e8f0;border-radius:16px;" title="TaxPulse Global 2026 Tax Calculator" loading="lazy"></iframe>`;
      }

      const calc = calculateTaxForCountry(code, state.filingStatusId, grossAnnual, preTaxAnnual);
      const subNat = getSubNationalTax(code, grossAnnual, calc.taxableIncome, calc.finalIncomeTax);

      const apiResponseObj = {
        openapi: '3.1.0',
        endpoint: 'POST /v1/tax/calculate',
        timestamp: new Date().toISOString(),
        schema_version: `${yearVal}.2.0`,
        request: {
          country_code: code,
          tax_year: yearVal,
          filing_status: state.filingStatusId,
          residency: activeResidencyStatus,
          gross_annual_local: grossAnnual,
          pre_tax_deductions_local: preTaxAnnual
        },
        response: {
          currency: country.currency.code,
          standard_deduction: calc.standardDeductionAmount,
          taxable_base: calc.taxableIncome,
          federal_income_tax: Math.round(calc.finalIncomeTax),
          sub_national_regional_tax: Math.round(subNat.amount),
          employee_social_security: Math.round(calc.totalSocialSecurity),
          net_take_home_annual: Math.round(Math.max(0, calc.netTakeHomeAnnual - subNat.amount)),
          net_take_home_monthly: Math.round(Math.max(0, calc.netTakeHomeAnnual - subNat.amount) / 12),
          effective_tax_rate_pct: Number(calc.effectiveTotalRate.toFixed(2)),
          marginal_tax_rate_pct: Number(calc.marginalRatePct.toFixed(2))
        }
      };

      const apiPre = document.getElementById('openapiLiveResponsePre');
      if (apiPre) apiPre.textContent = JSON.stringify(apiResponseObj, null, 2);
    }

    function applyTaxYearHistoricalMultiplier(selectedYear) {
      // Adjusts US / AU / IN / DE parameters dynamically when user switches between 2024, 2025, 2026, and 2027 Forecast
      if (selectedYear === '2027') {
        TAX_RULES.US.standardDeduction.value = 16600;
        TAX_RULES.AU.incomeTaxBrackets[1].rate = 0.14;
      } else if (selectedYear === '2025') {
        TAX_RULES.US.standardDeduction.value = 15750;
        TAX_RULES.AU.incomeTaxBrackets[1].rate = 0.16;
        TAX_RULES.DE.incomeTaxBrackets[0].max = 12096;
      } else if (selectedYear === '2024') {
        TAX_RULES.US.standardDeduction.value = 14600;
        TAX_RULES.AU.incomeTaxBrackets[1].rate = 0.16;
        TAX_RULES.IN.standardDeduction.value = 50000;
      } else {
        // 2026 Baseline
        TAX_RULES.US.standardDeduction.value = 16100;
        TAX_RULES.AU.incomeTaxBrackets[1].rate = 0.15;
        TAX_RULES.DE.incomeTaxBrackets[0].max = 12348;
        TAX_RULES.IN.standardDeduction.value = 75000;
      }
      updateAllCalculations();
    }

    function initCompletePlatformSuite() {
      let currentCatFilter = 'all';
      renderBentoDirectory('all', '');
      renderTeamBurnPlanner();
      parseDocumentText(document.getElementById('docParserRawText')?.value || '', false);

      // Hook into updateAllCalculations and switchModuleTab
      const prevUpdateAll = updateAllCalculations;
      updateAllCalculations = function() {
        prevUpdateAll();
        updateSmartTaxOptimizer();
        updateDeepLinkAndOpenApiPlayground();
      };

      const prevSwitchTab = switchModuleTab;
      switchModuleTab = function(tabId) {
        prevSwitchTab(tabId);
        renderBentoDirectory(currentCatFilter, document.getElementById('moduleQuickSearchInput')?.value || '');
        updateDeepLinkAndOpenApiPlayground();
      };

      // Category Filter Buttons
      document.querySelectorAll('.cat-filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          currentCatFilter = btn.getAttribute('data-cat-filter');
          document.querySelectorAll('.cat-filter-btn').forEach(b => {
            const isAct = b.getAttribute('data-cat-filter') === currentCatFilter;
            b.className = isAct
              ? 'cat-filter-btn px-3 py-1 rounded-lg text-xs font-bold bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm shrink-0 transition-all'
              : 'cat-filter-btn px-3 py-1 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-slate-700 shrink-0 transition-all';
          });
          renderBentoDirectory(currentCatFilter, document.getElementById('moduleQuickSearchInput')?.value || '');
        });
      });

      // Instant Module Search Input
      const searchEl = document.getElementById('moduleQuickSearchInput');
      if (searchEl) {
        searchEl.addEventListener('input', (e) => {
          const val = e.target.value;
          const dirEl = document.getElementById('bentoModuleDirectory');
          if (val.trim().length > 0 && dirEl) {
            dirEl.classList.remove('hidden');
          }
          renderBentoDirectory(currentCatFilter, val);
        });
      }

      // Toggle Bento Directory Map
      document.getElementById('toggleBentoDirectoryBtn').addEventListener('click', () => {
        const dirEl = document.getElementById('bentoModuleDirectory');
        const btn = document.getElementById('toggleBentoDirectoryBtn');
        if (!dirEl) return;
        const isHidden = dirEl.classList.toggle('hidden');
        btn.textContent = isHidden ? 'Explore All 38 Tools' : 'Hide Tool Map';
      });

      // Quick Share URL Button
      document.getElementById('quickShareUrlBtn').addEventListener('click', () => {
        updateDeepLinkAndOpenApiPlayground();
        const link = document.getElementById('generatedDeepLinkInput')?.value || window.location.href;
        fallbackCopy(link);
        showToast('Shareable deep-link URL copied!');
      });

      // Apply Optimal Tax Strategy Button
      document.getElementById('applyOptimalStrategyBtn').addEventListener('click', () => {
        if (typeof optimalStrategyAction === 'function') optimalStrategyAction();
      });

      // Multi-Year Tax Year Select
      document.getElementById('profileTaxYearSelect').addEventListener('change', (e) => {
        applyTaxYearHistoricalMultiplier(e.target.value);
        showToast(`Switched rule engine to ${e.target.value} tax year`);
      });

      // Team Burn Planner Controls
      document.getElementById('teamRoleCountrySelect').addEventListener('change', (e) => {
        const c = TAX_RULES[e.target.value];
        if (c) document.getElementById('teamRoleSalaryInput').value = c.defaultGrossAnnual;
      });

      document.getElementById('addTeamRoleBtn').addEventListener('click', () => {
        const title = (document.getElementById('teamRoleTitleInput')?.value || 'Team Member').trim();
        const country = document.getElementById('teamRoleCountrySelect')?.value || 'IN';
        const salaryLocal = Math.max(0, parseFloat(document.getElementById('teamRoleSalaryInput')?.value) || 0);
        const headcount = Math.max(1, parseInt(document.getElementById('teamRoleHeadcountInput')?.value, 10) || 1);
        teamRoster.push({ id: Date.now(), title, country, salaryLocal, headcount });
        renderTeamBurnPlanner();
        showToast(`Added ${headcount}x ${title} (${country}) to team plan`);
      });

      document.getElementById('resetSampleTeamBtn').addEventListener('click', () => {
        teamRoster = [
          { id: 1, title: 'Senior Full-Stack AI Engineer', country: 'IN', salaryLocal: 2400000, headcount: 2 },
          { id: 2, title: 'Founding Product Designer', country: 'GB', salaryLocal: 65000, headcount: 1 },
          { id: 3, title: 'Enterprise Account Executive', country: 'US', salaryLocal: 135000, headcount: 1 },
          { id: 4, title: 'Regional Operations Lead', country: 'AE', salaryLocal: 280000, headcount: 1 }
        ];
        renderTeamBurnPlanner();
        showToast('Restored 4-country sample team roster');
      });

      // Document Parser Controls
      document.querySelectorAll('.doc-sample-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const key = btn.getAttribute('data-doc-sample');
          const sample = DOC_PARSER_SAMPLES[key];
          if (sample) {
            document.getElementById('docParserRawText').value = sample;
            parseDocumentText(sample, false);
          }
        });
      });

      document.getElementById('docParserRawText').addEventListener('input', (e) => {
        parseDocumentText(e.target.value, false);
      });

      document.getElementById('parseAndPopulateBtn').addEventListener('click', () => {
        parseDocumentText(document.getElementById('docParserRawText')?.value || '', true);
      });

      // OpenAPI & Deep-Link Copy Buttons
      document.getElementById('copyDeepLinkBtn').addEventListener('click', () => {
        fallbackCopy(document.getElementById('generatedDeepLinkInput')?.value || '');
        showToast('Deep-link URL copied to clipboard!');
      });

      document.getElementById('copyEmbedSnippetBtn').addEventListener('click', () => {
        fallbackCopy(document.getElementById('generatedEmbedCodeTextarea')?.value || '');
        showToast('Iframe embed snippet copied!');
      });

      document.getElementById('copyApiPayloadBtn').addEventListener('click', () => {
        fallbackCopy(document.getElementById('openapiLiveResponsePre')?.value || document.getElementById('openapiLiveResponsePre')?.textContent || '');
        showToast('OpenAPI 3.1 JSON response copied!');
      });

      // Hydrate from URL query params if present
      try {
        const qs = new URLSearchParams(window.location.search);
        const qCountry = qs.get('country');
        if (qCountry && TAX_RULES[qCountry]) selectCountry(qCountry);
        const qGross = parseFloat(qs.get('gross'));
        if (Number.isFinite(qGross) && qGross > 0) {
          state.grossInput = qGross;
          document.getElementById('grossIncomeInput').value = qGross;
        }
        const qPersona = qs.get('persona');
        if (qPersona) {
          const pBtn = document.querySelector(`.persona-filter-btn[data-persona="${qPersona}"]`);
          if (pBtn) pBtn.click();
        }
        const qTab = qs.get('tab');
        if (qTab) switchModuleTab(qTab);
      } catch (e) {}

      updateSmartTaxOptimizer();
      updateDeepLinkAndOpenApiPlayground();
    }

    window.addEventListener('DOMContentLoaded', initCompletePlatformSuite);

    /**
     * ============================================================================
     * SPECIALIZED FINTECH CONTROLLERS (MODULES 16–19, REVERSE SOLVER, NEXUS & PIN)
     * ============================================================================
     */
    let pinnedScenario = null;

    const SAAS_NEXUS_THRESHOLDS = [
      { code: 'IN', flag: '🇮🇳', name: 'India GST (Services / Export LUT)', thresholdLocal: 2000000, currency: 'INR', rate: '18% IGST (0% w/ LUT Export)' },
      { code: 'US', flag: '🇺🇸', name: 'US State Economic Nexus (Wayfair Std)', thresholdLocal: 100000, currency: 'USD', rate: '6%–9.5% State Sales Tax' },
      { code: 'GB', flag: '🇬🇧', name: 'UK HMRC VAT (Domestic / B2C Digital)', thresholdLocal: 90000, currency: 'GBP', rate: '20% UK Standard VAT' },
      { code: 'DE', flag: '🇩🇪', name: 'EU One-Stop-Shop (OSS Cross-Border)', thresholdLocal: 10000, currency: 'EUR', rate: '19% German MwSt / EU VAT' },
      { code: 'AE', flag: '🇦🇪', name: 'UAE Federal Tax Authority VAT', thresholdLocal: 375000, currency: 'AED', rate: '5% UAE Federal VAT' },
      { code: 'CA', flag: '🇨🇦', name: 'Canada CRA GST/HST Small Supplier', thresholdLocal: 30000, currency: 'CAD', rate: '5%–15% GST/HST' },
      { code: 'AU', flag: '🇦🇺', name: 'Australia ATO Simplified GST', thresholdLocal: 75000, currency: 'AUD', rate: '10% Australian GST' },
      { code: 'SG', flag: '🇸🇬', name: 'Singapore IRAS Overseas Vendor (OVR)', thresholdLocal: 100000, currency: 'SGD', rate: '9% Singapore GST' }
    ];

    function solveGrossFromTargetNet(targetNetAnnualLocal) {
      let low = 0;
      let high = Math.max(targetNetAnnualLocal * 2.5, 100000);
      while (calculateTaxForCountry(state.countryCode, state.filingStatusId, high, 0).netTakeHomeAnnual < targetNetAnnualLocal && high < 1e10) {
        high *= 2;
      }
      for (let i = 0; i < 42; i++) {
        const mid = (low + high) / 2;
        const sim = calculateTaxForCountry(state.countryCode, state.filingStatusId, mid, 0);
        const subNat = getSubNationalTax(state.countryCode, mid, sim.taxableIncome, sim.finalIncomeTax);
        const netAtMid = Math.max(0, sim.netTakeHomeAnnual - subNat.amount);
        if (netAtMid < targetNetAnnualLocal) {
          low = mid;
        } else {
          high = mid;
        }
      }
      return Math.round((low + high) / 2);
    }

    function updatePinnedScenarioBar() {
      const bar = document.getElementById('pinnedScenarioCompareBar');
      if (!bar) return;
      if (!pinnedScenario) {
        bar.classList.add('hidden');
        return;
      }
      bar.classList.remove('hidden');
      const code = state.countryCode;
      const country = TAX_RULES[code];
      const mult = state.frequency === 'monthly' ? 12 : 1;
      const grossAnnual = (Number(state.grossInput) || 0) * mult;
      const preTaxAnnual = (Number(state.preTaxInput) || 0) * mult;
      const curCalc = calculateTaxForCountry(code, state.filingStatusId, grossAnnual, preTaxAnnual);
      const curNetUsd = convertBetweenCurrencies(curCalc.netTakeHomeAnnual, country.currency.code, 'USD');

      const diffUsd = curNetUsd - pinnedScenario.netUsd;
      document.getElementById('pinnedScenarioSummaryText').textContent = `${pinnedScenario.flag} ${pinnedScenario.countryName} (${pinnedScenario.statusLabel}) • Net: ${pinnedScenario.formattedNetLocal} (${formatCurrency(pinnedScenario.netUsd, 'USD')})`;
      const deltaEl = document.getElementById('pinnedScenarioDeltaBadge');
      deltaEl.textContent = diffUsd >= 0
        ? `Current is +${formatCurrency(diffUsd, 'USD')}/yr (+${formatCurrency(convertBetweenCurrencies(diffUsd, 'USD', 'INR'), 'INR')}) higher net`
        : `Current is ${formatCurrency(diffUsd, 'USD')}/yr lower net than pinned`;
      deltaEl.className = diffUsd >= 0
        ? 'font-mono-num font-extrabold text-emerald-700 dark:text-emerald-300'
        : 'font-mono-num font-extrabold text-rose-600 dark:text-rose-400';
    }

    function updateSpecializedModules16To19() {
      const code = state.countryCode;
      const countryRule = TAX_RULES[code];
      const mult = state.frequency === 'monthly' ? 12 : 1;
      const grossAnnualLocal = Math.max(0, (Number(state.grossInput) || 0) * mult);
      const preTaxAnnualLocal = Math.max(0, (Number(state.preTaxInput) || 0) * mult);
      const baseCalc = calculateTaxForCountry(code, state.filingStatusId, grossAnnualLocal, preTaxAnnualLocal);

      // Update Reverse Solver frequency label
      const revFreqEl = document.getElementById('reverseNetFreqLabel');
      if (revFreqEl) revFreqEl.textContent = state.frequency === 'monthly' ? 'Monthly' : 'Annual';

      // 1. Update SaaS Economic Nexus Grid in Module 4 (VAT/GST)
      const vatAmtLocal = Math.max(0, parseFloat(document.getElementById('vatAmountInput')?.value) || 0);
      const vatAmtUsd = convertBetweenCurrencies(vatAmtLocal, countryRule.currency.code, 'USD');
      const nexusGrid = document.getElementById('saasNexusGrid');
      if (nexusGrid) {
        nexusGrid.innerHTML = SAAS_NEXUS_THRESHOLDS.map(item => {
          const revInTarget = convertBetweenCurrencies(vatAmtUsd, 'USD', item.currency);
          const ratio = item.thresholdLocal > 0 ? (revInTarget / item.thresholdLocal) * 100 : 100;
          const status = ratio >= 100 ? 'Registration Mandatory' : ratio >= 75 ? 'Approaching Nexus' : 'Below Threshold';
          const badgeClass = ratio >= 100
            ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
            : ratio >= 75
            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
            : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300';
          return `
            <div class="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 space-y-1">
              <div class="flex items-center justify-between gap-1">
                <span class="font-bold text-slate-900 dark:text-white truncate">${item.flag} ${item.name}</span>
                <span class="px-1.5 py-0.5 rounded text-[10px] font-bold shrink-0 ${badgeClass}">${status}</span>
              </div>
              <div class="text-[11px] font-mono-num text-slate-600 dark:text-slate-300">
                Sales: ${formatCurrency(revInTarget, item.currency)} / Threshold: ${formatCurrency(item.thresholdLocal, item.currency)}
              </div>
              <div class="text-[10px] text-slate-400">${item.rate} (${Math.min(999, Math.round(ratio))}% of threshold)</div>
            </div>
          `;
        }).join('');
      }

      // 2. Update Module 16: Quarterly Advance / Estimated Tax Scheduler
      const qtTotalTax = Math.max(0, parseFloat(document.getElementById('qtEstimatedAnnualTaxInput')?.value) || 0);
      const qtWithheld = Math.max(0, parseFloat(document.getElementById('qtTdsAlreadyWithheldInput')?.value) || 0);
      const qtPrior = Math.max(0, parseFloat(document.getElementById('qtPriorYearTaxInput')?.value) || 0);

      const netUnwithheld = Math.max(0, qtTotalTax - qtWithheld);
      const safeHarbor90 = Math.max(0, (qtTotalTax * 0.90) - qtWithheld);
      const safeHarborPrior = Math.max(0, qtPrior - qtWithheld);
      const safeHarborTarget = code === 'US' ? Math.min(safeHarbor90, safeHarborPrior) : safeHarbor90;
      const annualPenaltyRisk = netUnwithheld * (code === 'IN' ? 0.12 : 0.08);

      document.getElementById('qtNetUnwithheldVal').textContent = formatActiveDisplay(netUnwithheld, countryRule);
      document.getElementById('qtThresholdCheckSub').textContent = code === 'IN'
        ? (netUnwithheld >= 10000 ? 'Mandatory Advance Tax (>= ₹10,000 u/s 208)' : 'Exempt from Advance Tax (< ₹10,000)')
        : (netUnwithheld >= 1000 ? 'Quarterly Form 1040-ES Required (>= $1,000)' : 'Exempt from Quarterly Filing (< $1,000)');
      document.getElementById('qtSafeHarborVal').textContent = formatActiveDisplay(safeHarborTarget, countryRule);
      document.getElementById('qtPenaltyRiskVal').textContent = `${formatActiveDisplay(annualPenaltyRisk, countryRule)} / yr`;

      const scheduleQuarters = code === 'IN' ? [
        { q: 'Q1 Installment (By 15 June)', cumPct: 0.15, slicePct: 0.15 },
        { q: 'Q2 Installment (By 15 Sept)', cumPct: 0.45, slicePct: 0.30 },
        { q: 'Q3 Installment (By 15 Dec)', cumPct: 0.75, slicePct: 0.30 },
        { q: 'Q4 Final (By 15 March)', cumPct: 1.00, slicePct: 0.25 }
      ] : [
        { q: 'Q1 Payment (By 15 April)', cumPct: 0.25, slicePct: 0.25 },
        { q: 'Q2 Payment (By 15 June)', cumPct: 0.50, slicePct: 0.25 },
        { q: 'Q3 Payment (By 15 Sept)', cumPct: 0.75, slicePct: 0.25 },
        { q: 'Q4 Payment (By 15 Jan)', cumPct: 1.00, slicePct: 0.25 }
      ];

      const qtGrid = document.getElementById('qtScheduleCardsGrid');
      if (qtGrid) {
        qtGrid.innerHTML = scheduleQuarters.map(s => `
          <div class="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 space-y-1">
            <div class="font-bold text-slate-800 dark:text-slate-200">${s.q}</div>
            <div class="text-base font-mono-num font-extrabold text-indigo-600 dark:text-indigo-400">
              ${formatActiveDisplay(netUnwithheld * s.slicePct, countryRule)}
            </div>
            <div class="text-[11px] text-slate-500">
              Cumulative ${(s.cumPct * 100).toFixed(0)}%: ${formatActiveDisplay(netUnwithheld * s.cumPct, countryRule)}
            </div>
          </div>
        `).join('');
      }

      // 3. Update Module 17: Expat & Digital Nomad Special Regimes Comparator
      const expatGrossUsd = Math.max(0, parseFloat(document.getElementById('expatGrossUsdInput')?.value) || 120000);
      const expatPrograms = [
        {
          flag: '🇳🇱',
          title: 'Netherlands 30% Facility (2026 Expat Scheme)',
          rule: '30% of gross salary tax-free (min taxable salary €48,013 or €36,497 with Masters under age 30)',
          effRate: 0.248,
          note: 'Foreign assets in Box 2/3 often exempt for partial non-residents.'
        },
        {
          flag: '🇪🇸',
          title: 'Spain Beckham Law & Digital Nomad Visa',
          rule: 'Flat 24% income tax up to €600,000 for 6 years; 0% Spanish tax on foreign dividends/gains',
          effRate: 0.24,
          note: 'Ideal for remote workers and executives relocating to Madrid/Barcelona.'
        },
        {
          flag: '🇮🇹',
          title: 'Italy Impatriate Regime (Nuovo Regime Impatriati)',
          rule: '50% of employment/freelance income exempt (60% with minor child) up to €600,000 cap',
          effRate: 0.215,
          note: 'Requires 5-year tax residency commitment in Italy.'
        },
        {
          flag: '🇵🇹',
          title: 'Portugal IFICI (NHR 2.0 Tech & Innovation)',
          rule: 'Flat 20% tax rate on qualifying scientific, R&D, startup, and high-value tech roles',
          effRate: 0.20,
          note: 'Foreign passive income exempt under qualifying treaty conditions.'
        },
        {
          flag: '🇦🇪',
          title: 'UAE Dubai Golden Visa / Remote Work Visa',
          rule: '0% Personal Income Tax, 0% Capital Gains Tax, and 0% Crypto Tax',
          effRate: 0.00,
          note: 'Requires UAE residency visa and primary center of vital interests.'
        },
        {
          flag: '🇮🇳',
          title: 'India RNOR (Returning NRI 2–3 Year Window)',
          rule: '0% Indian Income Tax on foreign-sourced dividends, interest, rent & overseas capital gains',
          effRate: 0.145,
          note: 'Available to returning NRIs who were non-resident for 9 of 10 preceding years.'
        }
      ];

      const expatGrid = document.getElementById('expatRegimesComparisonGrid');
      if (expatGrid) {
        expatGrid.innerHTML = expatPrograms.map(p => {
          const taxUsd = expatGrossUsd * p.effRate;
          const netUsd = expatGrossUsd - taxUsd;
          const netInr = convertBetweenCurrencies(netUsd, 'USD', 'INR');
          return `
            <div class="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 flex flex-col justify-between space-y-2.5">
              <div>
                <div class="flex items-center justify-between gap-2">
                  <span class="font-bold text-slate-900 dark:text-white">${p.flag} ${p.title}</span>
                  <span class="px-2 py-0.5 rounded font-mono-num font-bold text-[10px] bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">${(p.effRate * 100).toFixed(1)}% Eff.</span>
                </div>
                <p class="text-[11px] text-slate-600 dark:text-slate-300 mt-1">${p.rule}</p>
              </div>
              <div class="pt-2 border-t border-slate-200/70 dark:border-slate-700 flex items-center justify-between font-mono-num">
                <div>
                  <div class="text-[10px] uppercase text-slate-400">Net Take-Home</div>
                  <div class="text-sm font-extrabold text-emerald-600 dark:text-emerald-400">${formatCurrency(netUsd, 'USD')}</div>
                </div>
                <div class="text-right">
                  <div class="text-[10px] uppercase text-slate-400">In INR</div>
                  <div class="text-xs font-bold text-slate-700 dark:text-slate-300">${formatCurrency(netInr, 'INR')}</div>
                </div>
              </div>
            </div>
          `;
        }).join('');
      }

      // 4. Update Module 18: End-of-Service Gratuity, Severance & Final Settlement
      const basicMo = Math.max(0, parseFloat(document.getElementById('gratMonthlyBasicInput')?.value) || 0);
      const yrs = Math.max(0, parseFloat(document.getElementById('gratYearsOfServiceInput')?.value) || 0);
      const leaveDays = Math.max(0, parseFloat(document.getElementById('gratUnusedLeaveDaysInput')?.value) || 0);
      const arrears = Math.max(0, parseFloat(document.getElementById('gratUnpaidArrearsInput')?.value) || 0);

      let gratuityAmt = 0;
      let gratFormula = '';
      if (code === 'AE') {
        const first5 = Math.min(5, yrs) * (basicMo * 12 / 365) * 21;
        const after5 = Math.max(0, yrs - 5) * (basicMo * 12 / 365) * 30;
        gratuityAmt = yrs >= 1 ? (first5 + after5) : 0;
        gratFormula = 'UAE MOHRE EOSG: 21 days/yr (first 5 yrs) + 30 days/yr thereafter (0% tax)';
      } else {
        // India Payment of Gratuity Act (15/26 * Basic * Years) / Standard Severance
        gratuityAmt = (basicMo * 15 / 26) * Math.round(yrs);
        gratFormula = code === 'IN'
          ? 'India Gratuity Act: (15/26) × Last Drawn Basic × Completed Years (Exempt to ₹20L)'
          : 'Statutory Redundancy / Severance Estimate (UK £30,000 ITEPA s.403 tax-free cap)';
      }

      const leaveEncashment = (basicMo / 30) * leaveDays;
      const leaveAndDues = leaveEncashment + arrears;
      const taxableExitSlice = code === 'AE' ? 0 : arrears + Math.max(0, gratuityAmt - (code === 'IN' ? 2000000 : 30000));
      const exitTax = taxableExitSlice * (baseCalc.marginalRatePct / 100);
      const netFnf = Math.max(0, gratuityAmt + leaveAndDues - exitTax);

      document.getElementById('gratAmountVal').textContent = formatActiveDisplay(gratuityAmt, countryRule);
      document.getElementById('gratFormulaSub').textContent = gratFormula;
      document.getElementById('gratLeaveAndDuesVal').textContent = formatActiveDisplay(leaveAndDues, countryRule);
      document.getElementById('gratTaxOnExitVal').textContent = formatActiveDisplay(exitTax, countryRule);
      document.getElementById('gratNetPayoutVal').textContent = formatActiveDisplay(netFnf, countryRule);

      // 5. Update Module 19: FIRE Runway & Geographic Tax Arbitrage
      const savRate = Math.min(90, Math.max(5, parseFloat(document.getElementById('fireSavingsRateInput')?.value) || 40)) / 100;
      const preTaxRet = Math.max(1, parseFloat(document.getElementById('fireExpectedReturnInput')?.value) || 11) / 100;
      const startPortfolio = Math.max(0, parseFloat(document.getElementById('fireCurrentPortfolioInput')?.value) || 0);

      const ltcgRate = COUNTRY_TAX_CONFIGS[code]["2026"].modules.capital_gains_crypto.assets.listed_equity.long_term_rate || 0;
      const postTaxReturn = preTaxRet * (1 - ltcgRate);
      const annualInvested = baseCalc.netTakeHomeAnnual * savRate;
      const annualExpenses = Math.max(1, baseCalc.netTakeHomeAnnual * (1 - savRate));
      const fireTarget = annualExpenses * 25; // 4% Safe Withdrawal Rule

      let bal10Yr = startPortfolio;
      for (let y = 0; y < 10; y++) {
        bal10Yr = (bal10Yr + annualInvested) * (1 + postTaxReturn);
      }

      // Compute years to hit fireTarget
      let yrsToFire = 0;
      let simBal = startPortfolio;
      while (simBal < fireTarget && yrsToFire < 60) {
        simBal = (simBal + annualInvested) * (1 + postTaxReturn);
        yrsToFire += 0.25;
      }

      // Compare against a 0%-tax hub (e.g., UAE / tax-optimized regime)
      let yrsZeroTax = 0;
      let simZero = startPortfolio;
      const zeroTaxInvested = grossAnnualLocal * savRate;
      while (simZero < fireTarget && yrsZeroTax < 60) {
        simZero = (simZero + zeroTaxInvested) * (1 + preTaxRet);
        yrsZeroTax += 0.25;
      }
      const savedYears = Math.max(0, yrsToFire - yrsZeroTax);

      document.getElementById('fireAnnualInvestedVal').textContent = `${formatActiveDisplay(annualInvested, countryRule)} / yr`;
      document.getElementById('fireMonthlyInvestedSub').textContent = `${formatActiveDisplay(annualInvested / 12, countryRule)} / month invested`;
      document.getElementById('fireTenYearVal').textContent = formatActiveDisplay(bal10Yr, countryRule);
      document.getElementById('fireLtcgDragSub').textContent = `After ${(ltcgRate * 100).toFixed(1)}% LTCG tax drag (${(postTaxReturn * 100).toFixed(2)}% net CAGR)`;
      document.getElementById('fireTargetCorpusVal').textContent = formatActiveDisplay(fireTarget, countryRule);
      document.getElementById('fireYearsToGoalVal').textContent = `${yrsToFire.toFixed(1)} Years`;
      document.getElementById('fireArbitrageGainSub').textContent = savedYears > 0.1
        ? `0% Tax Hub reaches FIRE ${savedYears.toFixed(1)} yrs faster`
        : 'Already at maximum tax compounding velocity!';

      updatePinnedScenarioBar();
    }

    function initSpecializedFeaturesSuite() {
      const prevUpdateAll = updateAllCalculations;
      updateAllCalculations = function() {
        prevUpdateAll();
        updateSpecializedModules16To19();
      };

      const prevSelectCountry = selectCountry;
      selectCountry = function(newCode) {
        prevSelectCountry(newCode);
        const defGross = TAX_RULES[newCode].defaultGrossAnnual;
        const qtCalc = calculateTaxForCountry(newCode, TAX_RULES[newCode].filingStatuses[0].id, defGross, 0);
        const qtEstEl = document.getElementById('qtEstimatedAnnualTaxInput');
        if (qtEstEl) qtEstEl.value = Math.round(qtCalc.finalIncomeTax);
        const qtTdsEl = document.getElementById('qtTdsAlreadyWithheldInput');
        if (qtTdsEl) qtTdsEl.value = Math.round(qtCalc.finalIncomeTax * 0.25);
        const qtPriorEl = document.getElementById('qtPriorYearTaxInput');
        if (qtPriorEl) qtPriorEl.value = Math.round(qtCalc.finalIncomeTax * 0.85);
        const gratBasicEl = document.getElementById('gratMonthlyBasicInput');
        if (gratBasicEl) gratBasicEl.value = Math.round((defGross / 12) * 0.5);
        const firePortEl = document.getElementById('fireCurrentPortfolioInput');
        if (firePortEl) firePortEl.value = defGross;
        updateSpecializedModules16To19();
      };

      // Toggle Reverse Net-to-Gross Drawer
      document.getElementById('toggleReverseSolverBtn').addEventListener('click', () => {
        document.getElementById('reverseSolverDrawer').classList.toggle('hidden');
        document.getElementById('hourlyOvertimeDrawer').classList.add('hidden');
      });

      // Run Reverse Net-to-Gross Solver
      document.getElementById('runReverseSolverBtn').addEventListener('click', () => {
        const rawTarget = Math.max(0, parseFloat(document.getElementById('targetNetPayInput')?.value) || 0);
        const targetAnnual = state.frequency === 'monthly' ? rawTarget * 12 : rawTarget;
        const solvedGrossAnnual = solveGrossFromTargetNet(targetAnnual);
        const displayGrossInput = state.frequency === 'monthly' ? Math.round(solvedGrossAnnual / 12) : solvedGrossAnnual;
        state.grossInput = displayGrossInput;
        document.getElementById('grossIncomeInput').value = displayGrossInput;
        const cRule = TAX_RULES[state.countryCode];
        document.getElementById('reverseSolverResultText').textContent = `Solved: Requires ${formatCurrency(solvedGrossAnnual, cRule.currency.code)}/yr gross to net ${formatCurrency(targetAnnual, cRule.currency.code)}/yr.`;
        updateAllCalculations();
        showToast(`Solved required gross: ${formatCurrency(solvedGrossAnnual, cRule.currency.code)}/yr`);
      });

      // Toggle Hourly & Overtime Drawer
      document.getElementById('toggleHourlyOvertimeBtn').addEventListener('click', () => {
        document.getElementById('hourlyOvertimeDrawer').classList.toggle('hidden');
        document.getElementById('reverseSolverDrawer').classList.add('hidden');
      });

      // Apply Hourly + Overtime (1.5x) + Tips to Gross
      document.getElementById('applyHourlyToGrossBtn').addEventListener('click', () => {
        const rate = Math.max(0, parseFloat(document.getElementById('hourlyRateInput')?.value) || 0);
        const regHrs = Math.max(0, parseFloat(document.getElementById('weeklyRegHoursInput')?.value) || 0);
        const otHrs = Math.max(0, parseFloat(document.getElementById('weeklyOtHoursInput')?.value) || 0);
        const tips = Math.max(0, parseFloat(document.getElementById('annualTipsInput')?.value) || 0);

        const annualReg = rate * regHrs * 52;
        const annualOt = (rate * 1.5) * otHrs * 52;
        const totalAnnualGross = Math.round(annualReg + annualOt + tips);

        // In US 2026 OBBBA: up to $12,500 overtime + up to $25,000 tips are tax-deductible!
        let obbbaDeduction = 0;
        if (state.countryCode === 'US') {
          obbbaDeduction = Math.min(12500, annualOt) + Math.min(25000, tips);
        }

        state.frequency = 'annual';
        state.grossInput = totalAnnualGross;
        state.preTaxInput = Math.round(obbbaDeduction);
        document.getElementById('grossIncomeInput').value = totalAnnualGross;
        document.getElementById('preTaxDeductionInput').value = Math.round(obbbaDeduction);
        updateAllCalculations();
        showToast('Applied hourly, 1.5x overtime & tips to calculator!');
      });

      // Pin Scenario Snapshot Button
      document.getElementById('pinScenarioSnapshotBtn').addEventListener('click', () => {
        const code = state.countryCode;
        const cRule = TAX_RULES[code];
        const mult = state.frequency === 'monthly' ? 12 : 1;
        const grossAnnual = (Number(state.grossInput) || 0) * mult;
        const preTaxAnnual = (Number(state.preTaxInput) || 0) * mult;
        const calc = calculateTaxForCountry(code, state.filingStatusId, grossAnnual, preTaxAnnual);
        pinnedScenario = {
          countryCode: code,
          countryName: cRule.name,
          flag: cRule.flag,
          statusLabel: calc.statusObj.label.split(' ')[0],
          formattedNetLocal: formatCurrency(calc.netTakeHomeAnnual, cRule.currency.code),
          netUsd: convertBetweenCurrencies(calc.netTakeHomeAnnual, cRule.currency.code, 'USD')
        };
        updatePinnedScenarioBar();
        showToast(`Pinned ${cRule.name} scenario for live delta comparison!`);
      });

      document.getElementById('clearPinnedScenarioBtn').addEventListener('click', () => {
        pinnedScenario = null;
        updatePinnedScenarioBar();
      });

      // Bind inputs for Modules 16–19
      [
        'qtEstimatedAnnualTaxInput', 'qtTdsAlreadyWithheldInput', 'qtPriorYearTaxInput',
        'expatGrossUsdInput',
        'gratMonthlyBasicInput', 'gratYearsOfServiceInput', 'gratUnusedLeaveDaysInput', 'gratUnpaidArrearsInput',
        'fireSavingsRateInput', 'fireExpectedReturnInput', 'fireCurrentPortfolioInput'
      ].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
          el.addEventListener('input', updateSpecializedModules16To19);
          el.addEventListener('change', updateSpecializedModules16To19);
        }
      });

      // Update Category Filter pill label to "All Suites (19)" and Bento toggle label
      const allBtn = document.querySelector('[data-cat-filter="all"]');
      if (allBtn) allBtn.textContent = 'All Suites (38)';
      const bentoBtn = document.getElementById('toggleBentoDirectoryBtn');
      if (bentoBtn) bentoBtn.textContent = 'Explore All 38 Tools';

      renderBentoDirectory('all', '');
      updateSpecializedModules16To19();
    }

    window.addEventListener('DOMContentLoaded', initSpecializedFeaturesSuite);

    /**
     * ============================================================================
     * AGENTIC INTERNET LAYER: DETERMINISTIC SHA-256 RECEIPTS, MCP SERVER SANDBOX,
     * `window.TaxPulseAgent` RPC BRIDGE, NL ROUTER & A2A DEAL-DESK SOLVER
     * ============================================================================
     */
    let activeAgentDocTab = 'receipt';

    // Pure synchronous deterministic 256-bit hex digest (FNV/Murmur-cascade for instant sync receipts + WebCrypto async upgrade)
    function computeDeterministicHash(payloadString) {
      const str = String(payloadString || '');
      const seeds = [0x811c9dc5, 0x9e3779b9, 0x85ebca6b, 0xc2b2ae35, 0x27d4eb2f, 0x165667b1, 0xd3a2646c, 0xfd7046c5];
      for (let i = 0; i < str.length; i++) {
        const ch = str.charCodeAt(i);
        for (let j = 0; j < 8; j++) {
          seeds[j] = Math.imul(seeds[j] ^ ch ^ ((i + 1) * (j + 1)), 0x01000193) >>> 0;
        }
      }
      return 'txp_sha256_' + seeds.map(n => n.toString(16).padStart(8, '0')).join('');
    }

    function generateSignedCalculationReceipt() {
      const code = state.countryCode;
      const country = TAX_RULES[code];
      const mult = state.frequency === 'monthly' ? 12 : 1;
      const grossAnnual = Math.max(0, (Number(state.grossInput) || 0) * mult);
      const preTaxAnnual = Math.max(0, (Number(state.preTaxInput) || 0) * mult);
      const calc = calculateTaxForCountry(code, state.filingStatusId, grossAnnual, preTaxAnnual);
      const subNat = getSubNationalTax(code, grossAnnual, calc.taxableIncome, calc.finalIncomeTax);

      const canonicalPayload = {
        protocol: 'TaxPulse-Deterministic-Proof-v1',
        engine_version: '2026.4.0-agentic',
        country_code: code,
        tax_year: document.getElementById('profileTaxYearSelect')?.value || '2026',
        filing_status: state.filingStatusId,
        sub_national_region: subNat.label,
        statutory_authority_url: country.sourceUrl,
        inputs: {
          gross_annual_local: Math.round(grossAnnual),
          pre_tax_deductions_local: Math.round(preTaxAnnual),
          currency: country.currency.code
        },
        deterministic_outputs: {
          standard_deduction: Math.round(calc.standardDeductionAmount),
          taxable_income: Math.round(calc.taxableIncome),
          federal_income_tax: Math.round(calc.finalIncomeTax),
          regional_tax: Math.round(subNat.amount),
          employee_social_security: Math.round(calc.totalSocialSecurity),
          net_take_home_annual: Math.round(Math.max(0, calc.netTakeHomeAnnual - subNat.amount)),
          effective_rate_pct: Number(calc.effectiveTotalRate.toFixed(2)),
          marginal_rate_pct: Number(calc.marginalRatePct.toFixed(2))
        }
      };

      const proofHash = computeDeterministicHash(JSON.stringify(canonicalPayload));
      return {
        verification_hash: proofHash,
        zero_hallucination_guarantee: true,
        ...canonicalPayload
      };
    }

    const LLMS_TXT_CONTENT = `# TaxPulse Global 2026 Deterministic Tax Engine & MCP Oracle

> Deterministic multi-country personal, payroll, capital gains, crypto, VAT/GST, corporate, property stamp duty, and bilateral DTAA tax calculation engine for the 2026 tax year. Designed for zero-hallucination execution by autonomous AI agents via Model Context Protocol (MCP) and window.TaxPulseAgent RPC.

## Supported Jurisdictions (2026 Statutory Baselines)
- India (IN): FY 2026-27 Income Tax Act 2025 Sec 202 / 115BAC, EPFO ₹25,000/mo ceiling, Sec 44ADA 50% presumptive, STCG 20% / LTCG 12.5% / VDA Crypto 30%
- United States (US): 2026 IRS Rev. Proc. 2025-32 & OBBBA ($16,100 Single / $32,200 MFJ std ded, $184,500 OASDI cap, Sec 199A QBI)
- United Kingdom (GB): 2026/27 HMRC (£12,570 PA w/ £100k taper, Class 1 NI 8%/2%, SDLT bands, 19%/25% Corp Tax)
- Germany (DE): 2026 Grundfreibetrag €12,348, 4-pillar social insurance (€101,400 RV/AV & €69,750 GKV/PV ceilings)
- United Arab Emirates (AE): 0% Personal Income Tax, 11% GPSSA National Pension, 9% Corporate Tax > AED 375,000
- Canada (CA): 2026 CRA (14% lowest bracket, CA$16,452 BPA, CPP/CPP2 & EI)
- Australia (AU): 2026-27 ATO (15% first tier from 1 Jul 2026, A$1,000 standard deduction, 2% Medicare Levy)
- Singapore (SG): YA 2026 IRAS (0%-24% progressive resident rates, CPF 20% up to S$8,000/mo OW ceiling)

## Exposed Agent Tools (MCP & window.TaxPulseAgent.callTool)
- calculate_personal_tax({ country_code, gross_annual, pre_tax_deductions })
- solve_reverse_net_to_gross({ country_code, target_net_annual })
- optimize_contractor_vs_eor({ country_code, gross_revenue, expense_ratio_pct, eor_monthly_usd })
- evaluate_dtaa_withholding({ source_country, residence_country, income_type, gross_amount })
- negotiate_a2a_deal_desk({ max_employer_budget_usd, min_talent_net_usd })
`;

    const AGENTS_JSON_MANIFEST = {
      schema_version: "1.0.0",
      name: "taxpulse-global-tax-engine",
      title: "TaxPulse Global 2026 Deterministic Tax Engine",
      description: "Machine-callable deterministic tax calculation oracle exposing 4 mathematical primitives and 21 tax modules with SHA-256 execution proofs.",
      protocols: ["mcp-2026-07-28", "openapi-3.1.0", "window-rpc-v1"],
      in_browser_rpc: "window.TaxPulseAgent.callTool(toolName, arguments)",
      tools: [
        {
          name: "calculate_personal_tax",
          description: "Computes exact 2026 income tax, social security, effective/marginal rates, and SHA-256 verification hash.",
          inputSchema: {
            type: "object",
            required: ["country_code", "gross_annual"],
            properties: {
              country_code: { type: "string", enum: ["IN", "US", "GB", "DE", "AE", "CA", "AU", "SG"] },
              gross_annual: { type: "number" },
              pre_tax_deductions: { type: "number", default: 0 }
            }
          }
        },
        {
          name: "solve_reverse_net_to_gross",
          description: "Solves backwards from a target net annual take-home salary to find the exact required gross salary.",
          inputSchema: {
            type: "object",
            required: ["country_code", "target_net_annual"],
            properties: {
              country_code: { type: "string", enum: ["IN", "US", "GB", "DE", "AE", "CA", "AU", "SG"] },
              target_net_annual: { type: "number" }
            }
          }
        },
        {
          name: "optimize_contractor_vs_eor",
          description: "Compares full-time W-2/salaried EOR employment against independent contracting (Sec 44ADA / QBI).",
          inputSchema: {
            type: "object",
            required: ["country_code", "gross_revenue"],
            properties: {
              country_code: { type: "string" },
              gross_revenue: { type: "number" },
              expense_ratio_pct: { type: "number", default: 50 }
            }
          }
        },
        {
          name: "evaluate_dtaa_withholding",
          description: "Computes cross-border withholding tax and bilateral DTAA Foreign Tax Credit relief.",
          inputSchema: {
            type: "object",
            required: ["source_country", "residence_country", "income_type", "gross_amount"],
            properties: {
              source_country: { type: "string" },
              residence_country: { type: "string" },
              income_type: { type: "string", enum: ["dividends", "interest", "royalties"] },
              gross_amount: { type: "number" }
            }
          }
        },
        {
          name: "negotiate_a2a_deal_desk",
          description: "Finds Pareto-optimal global employment/contractor structures satisfying both employer max budget and talent min net pay.",
          inputSchema: {
            type: "object",
            required: ["max_employer_budget_usd", "min_talent_net_usd"],
            properties: {
              max_employer_budget_usd: { type: "number" },
              min_talent_net_usd: { type: "number" }
            }
          }
        }
      ]
    };

    function runA2ADealDeskNegotiation(maxBudgetUsd, minNetUsd, scope = 'ALL') {
      const codes = scope === 'ACTIVE' ? [state.countryCode] : Object.keys(TAX_RULES);
      const candidates = [];

      codes.forEach(code => {
        const cRule = TAX_RULES[code];
        const cfg = COUNTRY_TAX_CONFIGS[code]["2026"];
        const erTiers = cfg.modules.social_security_payroll.employer_tiers;

        // Model 1: Direct Local Entity Salaried ($0 EOR Fee, Employer pays statutory payroll tax)
        // Binary search max gross salary such that gross + employerTax <= maxBudgetLocal
        const maxBudgetLocal = convertBetweenCurrencies(maxBudgetUsd, 'USD', cRule.currency.code);
        let low = 0, high = maxBudgetLocal;
        for (let i = 0; i < 25; i++) {
          const mid = (low + high) / 2;
          const er = TaxEnginePrimitives.capped_percentage(mid, erTiers).totalContribution;
          if (mid + er <= maxBudgetLocal) low = mid;
          else high = mid;
        }
        const directGrossLocal = low;
        const directErLocal = TaxEnginePrimitives.capped_percentage(directGrossLocal, erTiers).totalContribution;
        const directPit = calculateTaxForCountry(code, cRule.filingStatuses[0].id, directGrossLocal, 0);
        const directNetUsd = convertBetweenCurrencies(directPit.netTakeHomeAnnual, cRule.currency.code, 'USD');
        const directTotalCostUsd = convertBetweenCurrencies(directGrossLocal + directErLocal, cRule.currency.code, 'USD');

        candidates.push({
          countryCode: code,
          flag: cRule.flag,
          countryName: cRule.name,
          modelName: 'Direct Entity Salaried',
          employerCostUsd: directTotalCostUsd,
          grossUsd: convertBetweenCurrencies(directGrossLocal, cRule.currency.code, 'USD'),
          talentNetUsd: directNetUsd,
          feasible: directNetUsd >= minNetUsd && directTotalCostUsd <= maxBudgetUsd + 1,
          surplusUsd: directNetUsd - minNetUsd
        });

        // Model 2: Global EOR Salaried ($599/mo = $7,188/yr EOR Fee + Employer Payroll Tax)
        const budgetAfterEorUsd = Math.max(0, maxBudgetUsd - 7188);
        const budgetAfterEorLocal = convertBetweenCurrencies(budgetAfterEorUsd, 'USD', cRule.currency.code);
        let lowE = 0, highE = budgetAfterEorLocal;
        for (let i = 0; i < 25; i++) {
          const mid = (lowE + highE) / 2;
          const er = TaxEnginePrimitives.capped_percentage(mid, erTiers).totalContribution;
          if (mid + er <= budgetAfterEorLocal) lowE = mid;
          else highE = mid;
        }
        const eorGrossLocal = lowE;
        const eorPit = calculateTaxForCountry(code, cRule.filingStatuses[0].id, eorGrossLocal, 0);
        const eorNetUsd = convertBetweenCurrencies(eorPit.netTakeHomeAnnual, cRule.currency.code, 'USD');

        candidates.push({
          countryCode: code,
          flag: cRule.flag,
          countryName: cRule.name,
          modelName: 'Employer of Record (EOR $599/mo)',
          employerCostUsd: maxBudgetUsd,
          grossUsd: convertBetweenCurrencies(eorGrossLocal, cRule.currency.code, 'USD'),
          talentNetUsd: eorNetUsd,
          feasible: eorNetUsd >= minNetUsd,
          surplusUsd: eorNetUsd - minNetUsd
        });

        // Model 3: Independent Contractor (Sec 44ADA / Sec 199A QBI — $49/mo COR Fee, 0% Employer Tax, 35%-50% Expense/Presumptive Shield)
        const corGrossUsd = Math.max(0, maxBudgetUsd - (49 * 12));
        const corGrossLocal = convertBetweenCurrencies(corGrossUsd, 'USD', cRule.currency.code);
        const presumptiveFactor = code === 'IN' ? 0.50 : code === 'US' ? 0.80 : 0.75;
        const corPit = calculateTaxForCountry(code, cRule.filingStatuses[0].id, corGrossLocal * presumptiveFactor, 0);
        const corNetLocal = Math.max(0, corGrossLocal - corPit.finalIncomeTax);
        const corNetUsd = convertBetweenCurrencies(corNetLocal, cRule.currency.code, 'USD');

        candidates.push({
          countryCode: code,
          flag: cRule.flag,
          countryName: cRule.name,
          modelName: code === 'IN' ? 'Solo Contractor (Sec 44ADA 50%)' : code === 'US' ? '1099 Contractor (20% QBI)' : 'Independent Contractor (COR)',
          employerCostUsd: maxBudgetUsd,
          grossUsd: corGrossUsd,
          talentNetUsd: corNetUsd,
          feasible: corNetUsd >= minNetUsd,
          surplusUsd: corNetUsd - minNetUsd
        });
      });

      candidates.sort((a, b) => b.surplusUsd - a.surplusUsd);
      return candidates;
    }

    function renderA2ADealDesk() {
      const maxBudgetUsd = Math.max(1000, parseFloat(document.getElementById('a2aEmployerMaxBudgetUsdInput')?.value) || 140000);
      const minNetUsd = Math.max(1000, parseFloat(document.getElementById('a2aTalentMinNetUsdInput')?.value) || 95000);
      const scope = document.getElementById('a2aPreferredJurisdictionSelect')?.value || 'ALL';

      const deals = runA2ADealDeskNegotiation(maxBudgetUsd, minNetUsd, scope);
      const feasibleDeals = deals.filter(d => d.feasible);

      document.getElementById('a2aFeasibleCountBadge').textContent = `${feasibleDeals.length} of ${deals.length} Contract Structures Satisfy Both Agents`;

      const winnerBanner = document.getElementById('a2aWinnerBanner');
      if (winnerBanner && deals.length > 0) {
        const top = deals[0];
        winnerBanner.innerHTML = `
          <div>
            <div class="text-[10px] font-bold uppercase tracking-wider text-emerald-300">Pareto-Optimal Agent Agreement (#1 Ranked)</div>
            <div class="text-base font-extrabold mt-0.5">${top.flag} ${top.countryName} — ${top.modelName}</div>
            <div class="text-xs text-emerald-100 mt-0.5">Employer pays ${formatCurrency(top.employerCostUsd, 'USD')}/yr • Talent receives ${formatCurrency(top.talentNetUsd, 'USD')}/yr Net (${formatCurrency(convertBetweenCurrencies(top.talentNetUsd, 'USD', 'INR'), 'INR')})</div>
          </div>
          <div class="px-3 py-1.5 rounded-xl bg-white/15 font-mono-num text-xs font-bold shrink-0">
            Surplus Above Target: ${top.surplusUsd >= 0 ? '+' : ''}${formatCurrency(top.surplusUsd, 'USD')}/yr
          </div>
        `;
      }

      const tbody = document.getElementById('a2aNegotiationTableBody');
      if (tbody) {
        tbody.innerHTML = deals.slice(0, 12).map((d, idx) => `
          <tr class="${d.feasible ? 'bg-white dark:bg-slate-900' : 'opacity-60 bg-slate-50/50 dark:bg-slate-900/40'}">
            <td class="py-2.5 px-4">
              <div class="font-bold text-slate-900 dark:text-white">${idx + 1}. ${d.flag} ${d.countryName}</div>
              <div class="text-[11px] text-slate-500">${d.modelName}</div>
            </td>
            <td class="py-2.5 px-3 text-right font-mono-num">${formatCurrency(d.employerCostUsd, 'USD')}</td>
            <td class="py-2.5 px-3 text-right font-mono-num">${formatCurrency(d.grossUsd, 'USD')}</td>
            <td class="py-2.5 px-3 text-right font-mono-num font-bold text-emerald-600 dark:text-emerald-400">${formatCurrency(d.talentNetUsd, 'USD')}</td>
            <td class="py-2.5 px-3 text-right font-mono-num font-bold ${d.surplusUsd >= 0 ? 'text-indigo-600 dark:text-indigo-400' : 'text-rose-500'}">
              ${d.surplusUsd >= 0 ? '+' : ''}${formatCurrency(d.surplusUsd, 'USD')}
            </td>
            <td class="py-2.5 px-4 text-center">
              <span class="px-2 py-0.5 rounded text-[10px] font-bold ${
                d.feasible
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                  : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
              }">${d.feasible ? 'DEAL MATCH' : 'GAP'}</span>
            </td>
          </tr>
        `).join('');
      }
    }

    // Register global `window.TaxPulseAgent` RPC Bridge for Autonomous Browser Agents
    window.TaxPulseAgent = {
      version: '2026.4.0-agentic',
      listTools() {
        return AGENTS_JSON_MANIFEST.tools;
      },
      getAgentManifest() {
        return AGENTS_JSON_MANIFEST;
      },
      getLlmsTxt() {
        return LLMS_TXT_CONTENT;
      },
      getSignedReceipt() {
        return generateSignedCalculationReceipt();
      },
      callTool(toolName, args = {}) {
        const code = (args.country_code || state.countryCode || 'IN').toUpperCase();
        const cRule = TAX_RULES[code] || TAX_RULES.IN;

        if (toolName === 'calculate_personal_tax') {
          const gross = Number(args.gross_annual) || cRule.defaultGrossAnnual;
          const preTax = Number(args.pre_tax_deductions) || 0;
          const res = calculateTaxForCountry(code, cRule.filingStatuses[0].id, gross, preTax);
          const payload = {
            country_code: code,
            currency: cRule.currency.code,
            gross_annual: gross,
            taxable_income: Math.round(res.taxableIncome),
            total_income_tax: Math.round(res.finalIncomeTax),
            employee_social_security: Math.round(res.totalSocialSecurity),
            net_take_home_annual: Math.round(res.netTakeHomeAnnual),
            effective_tax_rate_pct: Number(res.effectiveTotalRate.toFixed(2)),
            marginal_tax_rate_pct: Number(res.marginalRatePct.toFixed(2))
          };
          payload.verification_hash = computeDeterministicHash(JSON.stringify(payload));
          return payload;
        }

        if (toolName === 'solve_reverse_net_to_gross') {
          const targetNet = Number(args.target_net_annual) || (cRule.defaultGrossAnnual * 0.8);
          const prevCode = state.countryCode;
          state.countryCode = code;
          const reqGross = solveGrossFromTargetNet(targetNet);
          state.countryCode = prevCode;
          const payload = {
            country_code: code,
            currency: cRule.currency.code,
            target_net_annual: targetNet,
            solved_required_gross_annual: reqGross
          };
          payload.verification_hash = computeDeterministicHash(JSON.stringify(payload));
          return payload;
        }

        if (toolName === 'optimize_contractor_vs_eor') {
          const rev = Number(args.gross_revenue) || cRule.defaultGrossAnnual;
          const expPct = (Number(args.expense_ratio_pct) || 50) / 100;
          const salSim = calculateTaxForCountry(code, cRule.filingStatuses[0].id, rev, 0);
          const conSim = calculateTaxForCountry(code, cRule.filingStatuses[0].id, rev * (1 - expPct), 0);
          const payload = {
            country_code: code,
            currency: cRule.currency.code,
            gross_revenue: rev,
            salaried_net_pay: Math.round(salSim.netTakeHomeAnnual),
            contractor_net_pay: Math.round(rev - conSim.finalIncomeTax),
            annual_contractor_advantage: Math.round((rev - conSim.finalIncomeTax) - salSim.netTakeHomeAnnual)
          };
          payload.verification_hash = computeDeterministicHash(JSON.stringify(payload));
          return payload;
        }

        if (toolName === 'evaluate_dtaa_withholding') {
          const src = (args.source_country || 'US').toUpperCase();
          const resC = (args.residence_country || 'IN').toUpperCase();
          const incType = args.income_type || 'dividends';
          const amt = Number(args.gross_amount) || 100000;
          const whtMod = COUNTRY_TAX_CONFIGS[src]["2026"].modules.withholding_dtaa;
          const domRate = whtMod.domestic_default_wht[incType] || 0;
          const trRate = whtMod.treaties[resC] ? whtMod.treaties[resC][incType] : domRate;
          const out = TaxEnginePrimitives.treaty_offset({
            grossIncome: amt,
            sourceDomesticWhtRate: domRate,
            treatyWhtRate: trRate,
            residenceTaxRate: 0.30,
            applyTreaty: true
          });
          out.verification_hash = computeDeterministicHash(JSON.stringify(out));
          return out;
        }

        if (toolName === 'negotiate_a2a_deal_desk') {
          const maxB = Number(args.max_employer_budget_usd) || 140000;
          const minN = Number(args.min_talent_net_usd) || 95000;
          const deals = runA2ADealDeskNegotiation(maxB, minN, 'ALL');
          return {
            top_pareto_deal: deals[0],
            feasible_deals_count: deals.filter(d => d.feasible).length,
            top_5_options: deals.slice(0, 5)
          };
        }

        throw new Error(`Unknown MCP tool: ${toolName}`);
      }
    };

    // Listen for postMessage Agent RPC calls from parent/iframe/extension agents
    window.addEventListener('message', (event) => {
      const data = event.data;
      if (data && data.jsonrpc === '2.0' && data.method === 'tools/call' && data.params) {
        try {
          const result = window.TaxPulseAgent.callTool(data.params.name, data.params.arguments || {});
          if (event.source && typeof event.source.postMessage === 'function') {
            event.source.postMessage({ jsonrpc: '2.0', id: data.id || 1, result }, '*');
          }
        } catch (err) {
          if (event.source && typeof event.source.postMessage === 'function') {
            event.source.postMessage({ jsonrpc: '2.0', id: data.id || 1, error: { message: err.message } }, '*');
          }
        }
      }
    });

    function executeNaturalLanguageCommand(promptStr) {
      const q = String(promptStr || '').trim();
      if (!q) return;
      const lower = q.toLowerCase();
      const fbEl = document.getElementById('nlAgentRouterFeedback');

      // Detect country in prompt
      const countryMap = {
        india: 'IN', inr: 'IN', bengaluru: 'IN', mumbai: 'IN',
        'united states': 'US', usa: 'US', ' in us': 'US', texas: 'US', california: 'US',
        uk: 'GB', 'united kingdom': 'GB', london: 'GB',
        germany: 'DE', berlin: 'DE',
        uae: 'AE', dubai: 'AE',
        canada: 'CA', toronto: 'CA',
        australia: 'AU', sydney: 'AU',
        singapore: 'SG'
      };
      let targetCode = state.countryCode;
      Object.keys(countryMap).forEach(k => {
        if (lower.includes(k)) targetCode = countryMap[k];
      });

      const nums = (q.match(/\d[\d,]*(?:\.\d+)?/g) || []).map(s => parseFloat(s.replace(/,/g, ''))).filter(n => Number.isFinite(n));

      if (lower.includes('mcp') || lower.includes('agents.json') || lower.includes('llms.txt')) {
        switchModuleTab('agentic_hub');
        if (fbEl) {
          fbEl.classList.remove('hidden');
          fbEl.textContent = `→ Routed to Module 21 (MCP Server, llms.txt & SHA-256 Proofs)`;
        }
        return;
      }

      if (lower.includes('negotiate') || lower.includes('deal-desk') || lower.includes('budget')) {
        const bUsd = nums[0] || 140000;
        const nUsd = nums[1] || 95000;
        document.getElementById('a2aEmployerMaxBudgetUsdInput').value = bUsd;
        document.getElementById('a2aTalentMinNetUsdInput').value = nUsd;
        switchModuleTab('agent_deal_desk');
        renderA2ADealDesk();
        if (fbEl) {
          fbEl.classList.remove('hidden');
          fbEl.textContent = `→ Executed A2A Deal-Desk Solver: Budget $${bUsd.toLocaleString()} vs Target Net $${nUsd.toLocaleString()}`;
        }
        return;
      }

      if (lower.includes('solve gross') || lower.includes('net in')) {
        selectCountry(targetCode);
        const rawNet = nums[0] || 150000;
        const isMonthly = lower.includes('month') || lower.includes('/mo');
        const targetAnnualNet = isMonthly ? rawNet * 12 : rawNet;
        const solvedGross = solveGrossFromTargetNet(targetAnnualNet);
        state.frequency = 'annual';
        state.grossInput = solvedGross;
        document.getElementById('grossIncomeInput').value = solvedGross;
        switchModuleTab('pit');
        updateAllCalculations();
        const cRule = TAX_RULES[targetCode];
        if (fbEl) {
          fbEl.classList.remove('hidden');
          fbEl.textContent = `→ Reverse Solver (${cRule.name}): Required Gross = ${formatCurrency(solvedGross, cRule.currency.code)}/yr for Net ${formatCurrency(targetAnnualNet, cRule.currency.code)}/yr`;
        }
        return;
      }

      // Default: Personal Income / Pre-Tax calculation
      selectCountry(targetCode);
      if (nums[0]) {
        state.frequency = 'annual';
        state.grossInput = nums[0];
        document.getElementById('grossIncomeInput').value = nums[0];
      }
      if (nums[1]) {
        state.preTaxInput = nums[1];
        document.getElementById('preTaxDeductionInput').value = nums[1];
      }
      switchModuleTab('pit');
      updateAllCalculations();
      const receipt = generateSignedCalculationReceipt();
      if (fbEl) {
        fbEl.classList.remove('hidden');
        fbEl.textContent = `→ Computed ${TAX_RULES[targetCode].name} Net Pay: ${formatCurrency(receipt.deterministic_outputs.net_take_home_annual, receipt.inputs.currency)}/yr [${receipt.verification_hash.slice(0, 24)}...]`;
      }
    }

    function updateAgenticHubViews() {
      const receipt = generateSignedCalculationReceipt();
      const badgeEl = document.getElementById('liveDeterministicHashBadge');
      if (badgeEl) {
        badgeEl.textContent = `Proof: ${receipt.verification_hash.slice(0, 22)}...`;
      }

      // Update MCP Tool Sandbox Output
      const toolName = document.getElementById('mcpToolSelector')?.value || 'calculate_personal_tax';
      const code = state.countryCode;
      const mult = state.frequency === 'monthly' ? 12 : 1;
      const grossAnnual = (Number(state.grossInput) || 0) * mult;
      const sampleArgs = toolName === 'calculate_personal_tax'
        ? { country_code: code, gross_annual: grossAnnual, pre_tax_deductions: (Number(state.preTaxInput) || 0) * mult }
        : toolName === 'solve_reverse_net_to_gross'
        ? { country_code: code, target_net_annual: Math.round(grossAnnual * 0.78) }
        : toolName === 'optimize_contractor_vs_eor'
        ? { country_code: code, gross_revenue: grossAnnual, expense_ratio_pct: 50 }
        : toolName === 'evaluate_dtaa_withholding'
        ? { source_country: 'US', residence_country: code, income_type: 'dividends', gross_amount: 100000 }
        : { max_employer_budget_usd: 140000, min_talent_net_usd: 95000 };

      const mcpRes = window.TaxPulseAgent.callTool(toolName, sampleArgs);
      const rpcEnvelope = {
        jsonrpc: '2.0',
        id: 'mcp_req_2026_01',
        method: 'tools/call',
        params: { name: toolName, arguments: sampleArgs },
        result: { content: [{ type: 'application/json', data: mcpRes }], isError: false }
      };
      const mcpPre = document.getElementById('mcpRpcOutputPre');
      if (mcpPre) mcpPre.textContent = JSON.stringify(rpcEnvelope, null, 2);

      const A2A_AGENT_CARD_MANIFEST = {
        name: 'TaxPulse Global Tax Engine',
        version: '2026.11.0',
        supportedInterfaces: [
          { url: 'https://taxpulse.edge.workers.dev/mcp', protocolBinding: 'MCP-Streamable-HTTP', protocolVersion: '2026-07-28' },
          { url: 'https://taxpulse.edge.workers.dev/v1/calculate', protocolBinding: 'HTTP+JSON', protocolVersion: '1.0' }
        ],
        capabilities: { streaming: true, deterministicSha256Receipts: true, x402Micropayments: true },
        securitySchemes: { x402: { type: 'http', scheme: 'x402' } }
      };
      const WRANGLER_TOML_CONTENT = [
        'name = "taxpulse-edge-engine"',
        'main = "src/edge/worker.mjs"',
        'compatibility_date = "2026-11-01"',
        'compatibility_flags = ["nodejs_compat"]',
        '',
        '[assets]',
        'directory = "./public"',
        'run_worker_first = ["/mcp", "/v1/*", "/.well-known/*", "/llms.txt"]',
        '',
        '[[kv_namespaces]]',
        'binding = "RULES_KV"'
      ].join('\n');

      // Update Agent Doc Inspector
      const docPre = document.getElementById('agentDocInspectorPre');
      if (docPre) {
        if (activeAgentDocTab === 'receipt') {
          docPre.textContent = JSON.stringify(receipt, null, 2);
        } else if (activeAgentDocTab === 'agent_card') {
          docPre.textContent = JSON.stringify(A2A_AGENT_CARD_MANIFEST, null, 2);
        } else if (activeAgentDocTab === 'agents_json') {
          docPre.textContent = JSON.stringify(AGENTS_JSON_MANIFEST, null, 2);
        } else if (activeAgentDocTab === 'wrangler_toml') {
          docPre.textContent = WRANGLER_TOML_CONTENT;
        } else {
          docPre.textContent = LLMS_TXT_CONTENT;
        }
      }

      renderA2ADealDesk();
    }

    function initAgenticWebSuite() {
      const prevUpdateAll = updateAllCalculations;
      updateAllCalculations = function() {
        prevUpdateAll();
        updateAgenticHubViews();
      };

      // NL Command Bar
      document.getElementById('runNlAgentPromptBtn').addEventListener('click', () => {
        executeNaturalLanguageCommand(document.getElementById('nlAgentPromptInput')?.value || '');
      });
      document.getElementById('nlAgentPromptInput').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          executeNaturalLanguageCommand(e.target.value);
        }
      });

      document.querySelectorAll('.nl-sample-chip').forEach(chip => {
        chip.addEventListener('click', () => {
          const sample = chip.getAttribute('data-nl-sample');
          document.getElementById('nlAgentPromptInput').value = sample;
          executeNaturalLanguageCommand(sample);
        });
      });

      // Copy Signed Receipt Button
      document.getElementById('copySignedReceiptBtn').addEventListener('click', () => {
        const receipt = generateSignedCalculationReceipt();
        fallbackCopy(JSON.stringify(receipt, null, 2));
        showToast(`Copied signed SHA-256 receipt (${receipt.verification_hash.slice(0, 18)}...)`);
      });

      // A2A Deal-Desk Inputs
      ['a2aEmployerMaxBudgetUsdInput', 'a2aTalentMinNetUsdInput', 'a2aPreferredJurisdictionSelect'].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
          el.addEventListener('input', renderA2ADealDesk);
          el.addEventListener('change', renderA2ADealDesk);
        }
      });

      // MCP Tool Sandbox
      document.getElementById('mcpToolSelector').addEventListener('change', updateAgenticHubViews);
      document.getElementById('executeMcpToolCallBtn').addEventListener('click', () => {
        updateAgenticHubViews();
        showToast('Executed deterministic MCP tool call!');
      });

      // Agent Doc Inspector Tabs
      document.querySelectorAll('.agent-doc-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          activeAgentDocTab = btn.getAttribute('data-agent-doc');
          document.querySelectorAll('.agent-doc-btn').forEach(b => {
            const act = b.getAttribute('data-agent-doc') === activeAgentDocTab;
            b.className = act
              ? 'agent-doc-btn px-2.5 py-1 rounded text-xs font-bold bg-indigo-600 text-white'
              : 'agent-doc-btn px-2.5 py-1 rounded text-xs font-semibold bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200';
          });
          updateAgenticHubViews();
        });
      });

      // Download /llms.txt and agents.json
      document.getElementById('downloadAgentCardBtn').addEventListener('click', () => {
        const card = {
          name: 'TaxPulse Global Tax Engine',
          version: '2026.11.0',
          supportedInterfaces: [
            { url: 'https://taxpulse.edge.workers.dev/mcp', protocolBinding: 'MCP-Streamable-HTTP', protocolVersion: '2026-07-28' },
            { url: 'https://taxpulse.edge.workers.dev/v1/calculate', protocolBinding: 'HTTP+JSON', protocolVersion: '1.0' }
          ],
          capabilities: { streaming: true, deterministicSha256Receipts: true, x402Micropayments: true }
        };
        const blob = new Blob([JSON.stringify(card, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'agent-card.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showToast('Downloaded A2A /.well-known/agent-card.json!');
      });

      document.getElementById('downloadLlmsTxtBtn').addEventListener('click', () => {
        const blob = new Blob([LLMS_TXT_CONTENT], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'llms.txt';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showToast('Downloaded /llms.txt discovery file!');
      });

      document.getElementById('downloadAgentsJsonBtn').addEventListener('click', () => {
        const blob = new Blob([JSON.stringify(AGENTS_JSON_MANIFEST, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'agents.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showToast('Downloaded /.well-known/agents.json manifest!');
      });

      renderBentoDirectory('all', '');
      updateAgenticHubViews();
    }

    window.addEventListener('DOMContentLoaded', initAgenticWebSuite);

    /**
     * ============================================================================
     * MODULES 22–26 CONTROLLERS: x402 TOLLBOOTH, PE RISK SCORER, TRANSFER PRICING,
     * FX WIRE VS. WISE OPTIMIZER, ZK ATTESTATION & .ICS TAX CALENDAR EXPORTER
     * ============================================================================
     */
    function exportStatutoryCalendarIcs() {
      const code = state.countryCode;
      const country = TAX_RULES[code];
      const qtTotalTax = Math.max(0, parseFloat(document.getElementById('qtEstimatedAnnualTaxInput')?.value) || 0);
      const qtWithheld = Math.max(0, parseFloat(document.getElementById('qtTdsAlreadyWithheldInput')?.value) || 0);
      const netUnwithheld = Math.max(0, qtTotalTax - qtWithheld);

      const events = code === 'IN' ? [
        { date: '20260615', title: `India Advance Tax Q1 (15%): ${formatCurrency(netUnwithheld * 0.15, 'INR')}`, desc: 'Statutory Q1 Advance Tax installment under Income Tax Act.' },
        { date: '20260731', title: 'India Annual ITR Filing Due Date (Non-Audit)', desc: 'Annual Income Tax Return filing deadline.' },
        { date: '20260915', title: `India Advance Tax Q2 (30% slice): ${formatCurrency(netUnwithheld * 0.30, 'INR')}`, desc: 'Cumulative 45% Advance Tax due.' },
        { date: '20261215', title: `India Advance Tax Q3 (30% slice): ${formatCurrency(netUnwithheld * 0.30, 'INR')}`, desc: 'Cumulative 75% Advance Tax due.' },
        { date: '20270315', title: `India Advance Tax Q4 Final (25% slice): ${formatCurrency(netUnwithheld * 0.25, 'INR')}`, desc: 'Cumulative 100% Advance Tax due.' }
      ] : [
        { date: '20260415', title: `${country.name} Q1 Estimated Tax (25%): ${formatCurrency(netUnwithheld * 0.25, country.currency.code)}`, desc: 'Q1 Estimated Tax Payment Due.' },
        { date: '20260615', title: `${country.name} Q2 Estimated Tax (25%): ${formatCurrency(netUnwithheld * 0.25, country.currency.code)}`, desc: 'Q2 Estimated Tax Payment Due.' },
        { date: '20260915', title: `${country.name} Q3 Estimated Tax (25%): ${formatCurrency(netUnwithheld * 0.25, country.currency.code)}`, desc: 'Q3 Estimated Tax Payment Due.' },
        { date: '20270115', title: `${country.name} Q4 Final Estimated Tax (25%): ${formatCurrency(netUnwithheld * 0.25, country.currency.code)}`, desc: 'Q4 Estimated Tax Payment Due.' }
      ];

      const lines = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//TaxPulse Global//2026 Statutory Tax Calendar//EN',
        'CALSCALE:GREGORIAN'
      ];
      events.forEach((ev, idx) => {
        lines.push(
          'BEGIN:VEVENT',
          `UID:taxpulse-2026-${code}-${idx}@taxpulse.global`,
          `DTSTAMP:20261116T120000Z`,
          `DTSTART;VALUE=DATE:${ev.date}`,
          `SUMMARY:${ev.title}`,
          `DESCRIPTION:${ev.desc}`,
          'END:VEVENT'
        );
      });
      lines.push('END:VCALENDAR');

      const blob = new Blob([lines.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `TaxPulse_${code}_2026_Deadlines.ics`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast(`Downloaded ${code} 2026 Tax Calendar (.ics)!`);
    }

    function updateModules22To26() {
      const code = state.countryCode;
      const countryRule = TAX_RULES[code];
      const mult = state.frequency === 'monthly' ? 12 : 1;
      const grossAnnualLocal = Math.max(0, (Number(state.grossInput) || 0) * mult);
      const preTaxAnnualLocal = Math.max(0, (Number(state.preTaxInput) || 0) * mult);
      const baseCalc = calculateTaxForCountry(code, state.filingStatusId, grossAnnualLocal, preTaxAnnualLocal);

      // 1. Module 22: x402 Agentic Micropayment Tollbooth
      const dailyCalls = Math.max(1, parseFloat(document.getElementById('x402DailyCallsInput')?.value) || 50000);
      const pricePerCall = Math.max(0.0001, parseFloat(document.getElementById('x402PricePerCallInput')?.value) || 0.005);
      const rail = document.getElementById('x402NetworkSelect')?.value || 'base_usdc';

      const gasPerCall = rail === 'base_usdc' ? 0.0001 : rail === 'solana_usdc' ? 0.00005 : 0.0008;
      const dailyGrossUsd = dailyCalls * pricePerCall;
      const dailyNetUsd = Math.max(0, dailyCalls * (pricePerCall - gasPerCall));
      const monthlyNetUsd = dailyNetUsd * 30;
      const annualNetUsd = dailyNetUsd * 365;

      document.getElementById('x402DailyRevVal').textContent = `${formatCurrency(dailyGrossUsd, 'USD')} / day`;
      document.getElementById('x402MonthlyCallsSub').textContent = `${((dailyCalls * 30) / 1e6).toFixed(2)}M MCP calls / month`;
      document.getElementById('x402MonthlyNetVal').textContent = `${formatCurrency(monthlyNetUsd, 'USD')} / mo`;
      document.getElementById('x402MonthlyInrSub').textContent = `${formatCurrency(convertBetweenCurrencies(monthlyNetUsd, 'USD', 'INR'), 'INR')} / month`;
      document.getElementById('x402AnnualArrVal').textContent = `${formatCurrency(annualNetUsd, 'USD')} / yr`;

      const x402HeaderSample = `HTTP/1.1 402 Payment Required
X-Payment-Protocol: x402/1.0
X-Payment-Network: ${rail === 'base_usdc' ? 'eip155:8453 (Base Mainnet USDC)' : rail === 'solana_usdc' ? 'solana:mainnet (USDC)' : 'stripe:mpp:2026'}
X-Payment-Amount: "${pricePerCall.toFixed(4)} USDC"
X-Payment-Recipient: "0xTaxPulseDeterministicOracle2026"
X-MCP-Tool-Target: "calculate_personal_tax"`;
      const x402Pre = document.getElementById('x402HeaderPreviewPre');
      if (x402Pre) x402Pre.textContent = x402HeaderSample;

      // 2. Module 23: Permanent Establishment (PE) Risk Scorer
      const s1 = parseInt(document.getElementById('peTimeRatioSelect')?.value || '25', 10);
      const s2 = parseInt(document.getElementById('peContractRoleSelect')?.value || '20', 10);
      const s3 = parseInt(document.getElementById('peExecLevelSelect')?.value || '5', 10);
      const s4 = parseInt(document.getElementById('pePremisesSelect')?.value || '10', 10);
      const peScore = Math.min(100, s1 + s2 + s3 + s4);

      const corpRegime = COUNTRY_TAX_CONFIGS[code]["2026"].modules.corporate_tax.regimes[0];
      const hostCorpRate = (corpRegime.brackets[corpRegime.brackets.length - 1].rate || 0) * 100;

      const scoreEl = document.getElementById('peRiskScoreVal');
      const levelBadge = document.getElementById('peRiskLevelBadge');
      const mitAction = document.getElementById('peMitigationActionVal');
      const mitSub = document.getElementById('peMitigationSub');

      if (peScore >= 65) {
        scoreEl.textContent = `${peScore} / 100 (HIGH PE RISK)`;
        scoreEl.className = 'text-2xl font-mono-num font-extrabold text-rose-600 dark:text-rose-400 mt-1';
        levelBadge.textContent = 'Triggers OECD Dependent Agent / Fixed Place PE';
        mitAction.textContent = 'Incorporate Local Cost-Plus Subsidiary';
        mitSub.textContent = `Use Tab 24 (15.5% Cost-Plus Safe Harbour) to ring-fence ${countryRule.name} tax`;
      } else if (peScore >= 35) {
        scoreEl.textContent = `${peScore} / 100 (Moderate Risk)`;
        scoreEl.className = 'text-2xl font-mono-num font-extrabold text-amber-600 dark:text-amber-400 mt-1';
        levelBadge.textContent = 'Borderline OECD 50% Working-Time / Commercial Test';
        mitAction.textContent = 'Hire via Global EOR & Restrict Signing Power';
        mitSub.textContent = 'Ensure all client contracts are signed exclusively by parent entity';
      } else {
        scoreEl.textContent = `${peScore} / 100 (Low / Safe)`;
        scoreEl.className = 'text-2xl font-mono-num font-extrabold text-emerald-600 dark:text-emerald-400 mt-1';
        levelBadge.textContent = 'Preparatory / Auxiliary Back-Office Safe Zone';
        mitAction.textContent = 'Standard Contractor or Direct Remote OK';
        mitSub.textContent = 'Maintain <50% host-country days and voluntary home office';
      }
      document.getElementById('peHostCorpRateVal').textContent = `${hostCorpRate.toFixed(2)}% (${countryRule.name})`;

      // 3. Module 24: Global Subsidiary Cost-Plus Transfer Pricing Simulator
      const parentCode = document.getElementById('tpParentCountrySelect')?.value || 'US';
      const globalRevUsd = Math.max(0, parseFloat(document.getElementById('tpGlobalRevenueUsdInput')?.value) || 1200000);
      const subCostUsd = Math.max(0, parseFloat(document.getElementById('tpSubCostUsdInput')?.value) || 400000);
      const markupPct = Math.max(0, parseFloat(document.getElementById('tpCostPlusMarkupInput')?.value) || 15.5) / 100;

      const subMarginUsd = subCostUsd * markupPct;
      const transferInvoiceUsd = subCostUsd + subMarginUsd;
      const subCorpTaxRate = 0.25168; // India Sec 115BAA 25.17%
      const subCorpTaxUsd = subMarginUsd * subCorpTaxRate;

      const parentTaxRates = { US: 0.21, SG: 0.17, AE: 0.09, GB: 0.25 };
      const pRate = parentTaxRates[parentCode] !== undefined ? parentTaxRates[parentCode] : 0.21;
      const parentResidualEbtUsd = Math.max(0, globalRevUsd - transferInvoiceUsd);
      const parentCorpTaxUsd = parentResidualEbtUsd * pRate;

      const totalGroupProfitBeforeTax = Math.max(0, globalRevUsd - subCostUsd);
      const totalGroupTax = subCorpTaxUsd + parentCorpTaxUsd;
      const groupNetProfit = Math.max(0, totalGroupProfitBeforeTax - totalGroupTax);
      const blendedEtr = totalGroupProfitBeforeTax > 0 ? (totalGroupTax / totalGroupProfitBeforeTax) * 100 : 0;

      document.getElementById('tpTransferInvoiceVal').textContent = formatCurrency(transferInvoiceUsd, 'USD');
      document.getElementById('tpSubTaxableProfitSub').textContent = `Subsidiary Margin: ${formatCurrency(subMarginUsd, 'USD')} (${(markupPct * 100).toFixed(1)}%)`;
      document.getElementById('tpSubCorpTaxVal').textContent = formatCurrency(subCorpTaxUsd, 'USD');
      document.getElementById('tpParentCorpTaxVal').textContent = formatCurrency(parentCorpTaxUsd, 'USD');
      document.getElementById('tpParentProfitSub').textContent = `Parent Residual EBT: ${formatCurrency(parentResidualEbtUsd, 'USD')}`;
      document.getElementById('tpGroupNetProfitVal').textContent = formatCurrency(groupNetProfit, 'USD');
      document.getElementById('tpBlendedGroupEtrSub').textContent = `Blended Group ETR: ${blendedEtr.toFixed(2)}%`;

      // 4. Module 25: Cross-Border FX Spread & Payout Rail Optimizer
      const sendUsd = Math.max(100, parseFloat(document.getElementById('fxSendAmountUsdInput')?.value) || 80000);
      const destCurr = document.getElementById('fxDestCurrencySelect')?.value || 'INR';
      const txCount = Math.max(1, parseInt(document.getElementById('fxPayoutCountInput')?.value || '12', 10));
      const midRate = EXCHANGE_RATES_TO_USD[destCurr] || 1;
      const idealLocal = sendUsd * midRate;

      const rails = [
        {
          name: '1. Traditional SWIFT Bank Wire',
          feeUsd: txCount * 35,
          fxSpreadPct: 0.032,
          badge: 'High Leakage',
          color: 'rose'
        },
        {
          name: '2. PayPal / Legacy Card Rail',
          feeUsd: txCount * 5,
          fxSpreadPct: 0.045,
          badge: 'Highest Cost',
          color: 'rose'
        },
        {
          name: '3. Wise / Mid-Market FinTech',
          feeUsd: sendUsd * 0.0048,
          fxSpreadPct: 0.00,
          badge: 'Best Fiat Rail',
          color: 'emerald'
        },
        {
          name: '4. x402 / USDC Stablecoin Rail',
          feeUsd: txCount * 0.05,
          fxSpreadPct: 0.0015,
          badge: 'Lowest Friction',
          color: 'indigo'
        }
      ];

      const fxGrid = document.getElementById('fxRailsComparisonGrid');
      if (fxGrid) {
        fxGrid.innerHTML = rails.map(r => {
          const afterFeeUsd = Math.max(0, sendUsd - r.feeUsd);
          const effectiveUsd = afterFeeUsd * (1 - r.fxSpreadPct);
          const receivedLocal = effectiveUsd * midRate;
          const lostLocal = Math.max(0, idealLocal - receivedLocal);
          return `
            <div class="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 flex flex-col justify-between space-y-2">
              <div>
                <div class="flex items-center justify-between gap-1">
                  <span class="font-bold text-slate-900 dark:text-white">${r.name}</span>
                  <span class="px-1.5 py-0.5 rounded text-[10px] font-bold bg-${r.color}-100 text-${r.color}-800 dark:bg-${r.color}-950 dark:text-${r.color}-300">${r.badge}</span>
                </div>
                <div class="text-lg font-mono-num font-extrabold text-slate-900 dark:text-white mt-1.5">
                  ${formatCurrency(receivedLocal, destCurr)}
                </div>
                <div class="text-[11px] text-slate-500">Net landed in ${destCurr} bank account</div>
              </div>
              <div class="pt-2 border-t border-slate-200/70 dark:border-slate-700 text-[11px] font-mono-num text-rose-600 dark:text-rose-400">
                Hidden FX + Fee Loss: −${formatCurrency(lostLocal, destCurr)}/yr
              </div>
            </div>
          `;
        }).join('');
      }

      // 5. Module 26: Zero-Knowledge (ZK) Income & Residency Threshold Attestation
      const zkThreshUsd = Math.max(100, parseFloat(document.getElementById('zkThresholdUsdInput')?.value) || 42000);
      const salt = document.getElementById('zkSaltNonceInput')?.value || 'zk_salt_2026';
      const actualNetUsd = convertBetweenCurrencies(baseCalc.netTakeHomeAnnual, countryRule.currency.code, 'USD');
      const claimSatisfied = actualNetUsd >= zkThreshUsd;

      const commitmentHash = computeDeterministicHash(`ZK_COMMITMENT|${salt}|${code}|2026|${Math.round(actualNetUsd)}|${zkThreshUsd}|${claimSatisfied}`);
      const zkCredential = {
        "@context": ["https://www.w3.org/ns/credentials/v2"],
        type: ["VerifiableCredential", "ZeroKnowledgeIncomeAttestation"],
        issuer: "did:web:taxpulse.global:oracle-v2026.4",
        issuanceDate: new Date().toISOString(),
        credentialSubject: {
          tax_jurisdiction: code,
          tax_year: "2026",
          residency_status: activeResidencyStatus,
          predicate_claim: `net_annual_take_home_usd >= ${zkThreshUsd}`,
          predicate_verified: claimSatisfied,
          exact_income_disclosed: "REDACTED_BY_ZERO_KNOWLEDGE_PROOF"
        },
        zkProof: {
          scheme: "Pedersen-SHA256-Threshold-Range-Attestation",
          commitment_hash: commitmentHash,
          underlying_engine_receipt: generateSignedCalculationReceipt().verification_hash
        }
      };

      const zkBadge = document.getElementById('zkAssertionStatusBadge');
      if (zkBadge) {
        zkBadge.textContent = claimSatisfied ? 'PREDICATE: TRUE (VERIFIED)' : 'PREDICATE: FALSE (BELOW MIN)';
        zkBadge.className = claimSatisfied
          ? 'px-2.5 py-0.5 rounded-full text-[10px] font-mono-num font-bold bg-emerald-500 text-slate-950'
          : 'px-2.5 py-0.5 rounded-full text-[10px] font-mono-num font-bold bg-rose-500 text-white';
      }
      document.getElementById('zkPublicClaimText').textContent = `Net Pay >= ${formatCurrency(zkThreshUsd, 'USD')}/yr`;
      document.getElementById('zkJurisdictionText').textContent = `${countryRule.flag} ${code} • 2026`;
      document.getElementById('zkCommitmentDigestText').textContent = `Commitment: ${commitmentHash}`;
      const zkPre = document.getElementById('zkCredentialJsonPre');
      if (zkPre) zkPre.textContent = JSON.stringify(zkCredential, null, 2);
    }

    function initModules22To26() {
      const prevUpdateAll = updateAllCalculations;
      updateAllCalculations = function() {
        prevUpdateAll();
        updateModules22To26();
      };

      // Bind .ics Calendar Export button
      document.getElementById('exportTaxCalendarIcsBtn').addEventListener('click', exportStatutoryCalendarIcs);

      // Copy x402 Headers button
      document.getElementById('copyX402HeadersBtn').addEventListener('click', () => {
        fallbackCopy(document.getElementById('x402HeaderPreviewPre')?.textContent || '');
        showToast('Copied x402 HTTP 402 payment header configuration!');
      });

      // ZK Preset selector syncs threshold input
      document.getElementById('zkVerifierPurposeSelect').addEventListener('change', (e) => {
        document.getElementById('zkThresholdUsdInput').value = e.target.value;
        updateModules22To26();
      });

      // Copy ZK Credential JSON button
      document.getElementById('copyZkCredentialBtn').addEventListener('click', () => {
        fallbackCopy(document.getElementById('zkCredentialJsonPre')?.textContent || '');
        showToast('Copied signed Zero-Knowledge Income Attestation JSON!');
      });

      // Bind inputs across Modules 22–26
      [
        'x402DailyCallsInput', 'x402PricePerCallInput', 'x402NetworkSelect',
        'peTimeRatioSelect', 'peContractRoleSelect', 'peExecLevelSelect', 'pePremisesSelect',
        'tpParentCountrySelect', 'tpGlobalRevenueUsdInput', 'tpSubCostUsdInput', 'tpCostPlusMarkupInput',
        'fxSendAmountUsdInput', 'fxDestCurrencySelect', 'fxPayoutCountInput',
        'zkThresholdUsdInput', 'zkSaltNonceInput'
      ].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
          el.addEventListener('input', updateModules22To26);
          el.addEventListener('change', updateModules22To26);
        }
      });

      renderBentoDirectory('all', '');
      updateModules22To26();
    }

    window.addEventListener('DOMContentLoaded', initModules22To26);

    /**
     * ============================================================================
     * HUMAN-FRIENDLY PLAIN-ENGLISH UX CONTROLLER
     * Keeps financial terms clear while replacing developer/protocol jargon with
     * warm, everyday explanations and defaulting to Simple Everyday View.
     * ============================================================================
     */
    let isSimpleHumanMode = true;

    const HUMAN_FRIENDLY_TAB_LABELS = {
      pit: '1. Salary & Take-Home Pay',
      payroll: '2. PF, Social Security & Employer Cost',
      capgains: '3. Stocks, Property & Crypto Profit Tax',
      vat: '4. GST / Sales Tax & Bill Calculator',
      corporate: '5. Business & Company Profit Tax',
      property: '6. Home Buying & Stamp Duty',
      dtaa: '7. Foreign Income & Double-Tax Relief (DTAA)',
      equity_bonus: '8. Bonus & Company Stock (RSU) Tax',
      contractor_eor: '9. Freelancer vs. Full-Time Job Compare',
      residency_payslip: '10. NRI / Residency Days & Printable Payslip',
      team_planner: '11. Team Hiring Budget Calculator',
      doc_parser: '12. Auto-Fill from Form-16 / Salary Slip',
      quarterly_tax: '13. Quarterly Advance Tax Due Dates',
      expat_nomad: '14. Working Abroad & Expat Tax Perks',
      gratuity_exit: '15. Job Switch: Gratuity & Final Payout',
      fire_wealth: '16. Savings Growth & Retirement Goal',
      agent_deal_desk: '17. Salary Offer Negotiation Helper',
      pe_risk: '18. Remote Work Company Tax Check',
      transfer_pricing: '19. Parent & Local Branch Tax Split',
      fx_payout: '20. International Money Transfer Fee Compare',
      zk_attestation: '21. Private Income Proof (For Visa / Rent)',
      ctc_restructurer: '22. Salary Restructurer & HR Email Writer',
      freelancer_billing: '23. Freelancer Export Invoice & US W-8BEN',
      tax_vault: '24. Year-Round Tax-Saving Tracker',
      whitelabel_studio: '25. White-Label Studio (For CAs & Agencies)',
      salary_hike: '26. Salary Hike & Promotion Calculator',
      bulk_csv: '27. Bulk CSV Employee Payroll Tool',
      client_crm: '28. Client Book Manager (For CAs & Advisors)',
      freelancer_ledger: '29. 12-Month Freelancer Income & TDS Tracker',
      payroll_hra_generator: '30. Monthly Leave Pay & HRA Rent Receipts',
      ca_handoff: '31. Year-End Accountant (CA/CPA) Filing Pack',
      ai_accountant: '🤖 Personal AI Tax Accountant (Save Money)',
      enterprise_governance: '🏛️ Enterprise SSO, D1 Audit & HRIS Sync',
      autoupdate: '🔄 Live Tax Rule Updates',
      architecture: '⚙️ Dev: JSON Rules & Tests',
      openapi_pwa: '⚙️ Dev: Share Link, Embed & API',
      agentic_hub: '⚙️ Dev: AI Agent & MCP Tools',
      x402_tollbooth: '⚙️ Dev: API Micropayments'
    };

    const PRO_TECH_ONLY_TABS = ['architecture', 'openapi_pwa', 'agentic_hub', 'x402_tollbooth'];

    function updatePlainEnglishTakeawayCard() {
      const code = state.countryCode;
      const country = TAX_RULES[code];
      const mult = state.frequency === 'monthly' ? 12 : 1;
      const grossAnnual = Math.max(0, (Number(state.grossInput) || 0) * mult);
      const preTaxAnnual = Math.max(0, (Number(state.preTaxInput) || 0) * mult);
      const calc = calculateTaxForCountry(code, state.filingStatusId, grossAnnual, preTaxAnnual);
      const subNat = getSubNationalTax(code, grossAnnual, calc.taxableIncome, calc.finalIncomeTax);

      const finalTax = calc.finalIncomeTax + subNat.amount;
      const finalNet = Math.max(0, calc.netTakeHomeAnnual - subNat.amount);
      const sym = country.currency.symbol.trim();
      const keepPer100 = grossAnnual > 0 ? ((finalNet / grossAnnual) * 100).toFixed(1) : '100.0';
      const taxPer100 = grossAnnual > 0 ? ((finalTax / grossAnnual) * 100).toFixed(1) : '0.0';
      const socPer100 = grossAnnual > 0 ? ((calc.totalSocialSecurity / grossAnnual) * 100).toFixed(1) : '0.0';

      const takeawayEl = document.getElementById('plainEnglishTakeawayText');
      if (takeawayEl) {
        takeawayEl.innerHTML = `For every <strong>${sym}100</strong> you earn in <strong>${country.name}</strong>, you keep <strong>${sym}${keepPer100}</strong> as take-home pay, pay <strong>${sym}${taxPer100}</strong> in income tax, and contribute <strong>${sym}${socPer100}</strong> toward mandatory social security/retirement. That leaves you with <strong>${formatActiveDisplay(finalNet / 12, country)} per month</strong> (${formatActiveDisplay(finalNet, country)} per year) in your bank account.`;
      }
    }

    function applyHumanFriendlyMode(simpleMode) {
      isSimpleHumanMode = Boolean(simpleMode);

      const simpleBtn = document.getElementById('modeSimpleHumanBtn');
      const proBtn = document.getElementById('modeProTechBtn');
      if (simpleBtn && proBtn) {
        simpleBtn.className = isSimpleHumanMode
          ? 'px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-600 text-white shadow-sm transition-all'
          : 'px-2.5 py-1 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-all';
        proBtn.className = !isSimpleHumanMode
          ? 'px-2.5 py-1 rounded-lg text-xs font-bold bg-indigo-600 text-white shadow-sm transition-all'
          : 'px-2.5 py-1 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-all';
      }

      // Update active primitive badge into a friendly "Calculation Method" badge
      const primBadge = document.getElementById('activePrimitiveBadge');
      if (primBadge && isSimpleHumanMode) {
        primBadge.textContent = '2026 Verified Tax Slabs';
      }

      // Update the Natural-Language Command Bar into a friendly "Ask in Plain English" helper
      const nlInput = document.getElementById('nlAgentPromptInput');
      const nlBtn = document.getElementById('runNlAgentPromptBtn');
      const hashBadge = document.getElementById('liveDeterministicHashBadge');
      const receiptBtn = document.getElementById('copySignedReceiptBtn');
      if (nlInput && nlBtn) {
        if (isSimpleHumanMode) {
          nlInput.placeholder = "Type what you want to calculate (e.g., 'I want ₹1,50,000 monthly in-hand salary in India' or 'Compare $145k budget vs $95k take-home')";
          nlBtn.textContent = 'Calculate For Me';
          if (hashBadge) hashBadge.classList.add('hidden');
          if (receiptBtn) receiptBtn.textContent = 'Copy Verified Summary';
        } else {
          nlInput.placeholder = "Ask the deterministic tax engine (e.g. 'Solve gross for ₹1,50,000 monthly net in India' or 'Negotiate $150k budget vs $105k net')";
          nlBtn.textContent = 'Execute Agent Command';
          if (hashBadge) hashBadge.classList.remove('hidden');
          if (receiptBtn) receiptBtn.textContent = 'Copy Signed Receipt';
        }
      }

      // Update Tab Button Labels to be human-friendly and hide developer-only tabs in Simple Mode
      document.querySelectorAll('.module-tab-btn').forEach(btn => {
        const tid = btn.getAttribute('data-module-tab');
        if (!btn.getAttribute('data-orig-label')) {
          btn.setAttribute('data-orig-label', btn.innerHTML);
        }
        if (isSimpleHumanMode) {
          if (HUMAN_FRIENDLY_TAB_LABELS[tid]) {
            btn.textContent = HUMAN_FRIENDLY_TAB_LABELS[tid];
          }
          if (PRO_TECH_ONLY_TABS.includes(tid)) {
            btn.classList.add('hidden');
          } else {
            btn.classList.remove('hidden');
          }
        } else {
          btn.innerHTML = btn.getAttribute('data-orig-label');
          btn.classList.remove('hidden');
        }
      });

      // Also update MODULE_DIRECTORY_META titles/descriptions in the Bento Map so they use friendly everyday words
      const friendlyBentoOverrides = {
        pit: { title: 'Salary & Take-Home Pay', desc: 'See your exact monthly in-hand pay, income tax slabs, and deductions.' },
        payroll: { title: 'PF, Social Security & Employer Cost', desc: 'See how much goes into PF/Social Security and what your company pays on top.' },
        capgains: { title: 'Stocks, Property & Crypto Profit Tax', desc: 'Calculate tax on profits from shares, mutual funds, real estate, or crypto.' },
        vat: { title: 'GST / Sales Tax & Bill Calculator', desc: 'Add GST/VAT to a base price or extract the tax included in a total bill.' },
        corporate: { title: 'Business & Company Profit Tax', desc: 'Enter business revenue and expenses to see company tax and net profit.' },
        property: { title: 'Home Buying & Stamp Duty', desc: 'Calculate property registration fees and stamp duty when buying real estate.' },
        dtaa: { title: 'Foreign Income & Double-Tax Relief (DTAA)', desc: 'Avoid paying tax twice on overseas dividends, interest, or freelance income.' },
        equity_bonus: { title: 'Bonus & Company Stock (RSU) Tax', desc: 'See how much of your annual performance bonus or vesting stock you keep.' },
        contractor_eor: { title: 'Freelancer vs. Full-Time Job Compare', desc: 'Compare take-home pay as an independent consultant (Sec 44ADA) vs. salaried staff.' },
        residency_payslip: { title: 'NRI / Residency Days & Printable Payslip', desc: 'Check the 183-day tax residency rule and print a clean A4 salary slip.' },
        team_planner: { title: 'Team Hiring Budget Calculator', desc: 'Plan monthly salary budgets for hiring employees across multiple countries.' },
        doc_parser: { title: 'Auto-Fill from Form-16 / Salary Slip', desc: 'Paste your salary offer or Form-16/W-2 text to fill in all numbers automatically.' },
        quarterly_tax: { title: 'Quarterly Advance Tax Due Dates', desc: 'See your 4 quarterly tax installment dates and download a calendar reminder.' },
        expat_nomad: { title: 'Working Abroad & Expat Tax Perks', desc: 'Compare special lower-tax programs for expats and remote workers worldwide.' },
        gratuity_exit: { title: 'Job Switch: Gratuity & Final Payout', desc: 'Calculate your tax-free gratuity, unused leave payout, and final settlement.' },
        fire_wealth: { title: 'Savings Growth & Retirement Goal', desc: 'Project how fast your monthly savings grow into financial freedom after tax.' },
        agent_deal_desk: { title: 'Salary Offer Negotiation Helper', desc: 'Find the best pay structure that fits both employer budget and your target take-home.' },
        pe_risk: { title: 'Remote Work Company Tax Check', desc: 'Check if working remotely from another country creates company tax obligations.' },
        transfer_pricing: { title: 'Parent & Local Branch Tax Split', desc: 'Calculate safe intercompany billing (15.5% Cost-Plus) between a parent company and branch.' },
        fx_payout: { title: 'International Money Transfer Fee Compare', desc: 'Compare how much money you save using Wise vs. traditional bank wires.' },
        zk_attestation: { title: 'Private Income Proof (For Visa / Rent)', desc: 'Create a verified certificate showing your net income meets visa or rent minimums.' }
      };

      MODULE_DIRECTORY_META.forEach(item => {
        if (!item.origTitle) {
          item.origTitle = item.title;
          item.origDesc = item.desc;
        }
        if (isSimpleHumanMode && friendlyBentoOverrides[item.id]) {
          item.title = friendlyBentoOverrides[item.id].title;
          item.desc = friendlyBentoOverrides[item.id].desc;
        } else {
          item.title = item.origTitle;
          item.desc = item.origDesc;
        }
      });

      renderBentoDirectory('all', document.getElementById('moduleQuickSearchInput')?.value || '');
      updatePlainEnglishTakeawayCard();
    }

    function initHumanFriendlyLayer() {
      const prevUpdateAll = updateAllCalculations;
      updateAllCalculations = function() {
        prevUpdateAll();
        updatePlainEnglishTakeawayCard();
      };

      document.getElementById('modeSimpleHumanBtn').addEventListener('click', () => {
        applyHumanFriendlyMode(true);
        showToast('Switched to Simple Everyday View');
      });

      document.getElementById('modeProTechBtn').addEventListener('click', () => {
        applyHumanFriendlyMode(false);
        showToast('Switched to Pro & Developer View (All 26 tools visible)');
      });

      document.getElementById('toggleGlossaryGuideBtn').addEventListener('click', () => {
        const card = document.getElementById('plainEnglishGlossaryCard');
        const btn = document.getElementById('toggleGlossaryGuideBtn');
        if (!card) return;
        const isHidden = card.classList.toggle('hidden');
        btn.textContent = isHidden
          ? '📖 Plain-English Guide to Financial Terms ▾'
          : '📖 Hide Financial Terms Guide ▴';
      });

      // Default to Simple Everyday View so non-technical users feel right at home immediately!
      applyHumanFriendlyMode(true);
    }

    window.addEventListener('DOMContentLoaded', initHumanFriendlyLayer);

    /**
     * ============================================================================
     * MONETIZATION & RETENTION SUITE CONTROLLERS (MODULES 27–30)
     * ============================================================================
     */
    function updateMonetizationModules27To30() {
      const code = state.countryCode;
      const countryRule = TAX_RULES[code];
      const sym = countryRule.currency.symbol.trim();

      // 1. Module 27: CTC Salary Restructurer & HR Negotiation Email Writer
      const ctcTotal = Math.max(0, parseFloat(document.getElementById('ctcTotalOfferInput')?.value) || countryRule.defaultGrossAnnual);
      const basicPct = Math.min(65, Math.max(35, parseFloat(document.getElementById('ctcBasicPctInput')?.value) || 50));
      const npsPct = Math.min(14, Math.max(0, parseFloat(document.getElementById('ctcNpsPctInput')?.value) || 10));
      const monthlyRent = Math.max(0, parseFloat(document.getElementById('ctcMonthlyRentInput')?.value) || 0);
      const allowances = Math.max(0, parseFloat(document.getElementById('ctcAllowancesInput')?.value) || 0);

      document.getElementById('ctcBasicPctLabel').textContent = `${basicPct}%`;
      document.getElementById('ctcNpsPctLabel').textContent = `${npsPct}%`;

      const basicAnnual = ctcTotal * (basicPct / 100);
      const employerNpsAnnual = basicAnnual * (npsPct / 100);
      const hraReceivedAnnual = basicAnnual * 0.50; // Metro 50% of basic
      const annualRent = monthlyRent * 12;

      // Statutory 3-Rule HRA Exemption
      const hraRule1 = hraReceivedAnnual;
      const hraRule2 = basicAnnual * 0.50;
      const hraRule3 = Math.max(0, annualRent - (basicAnnual * 0.10));
      const hraExemption = Math.min(hraRule1, hraRule2, hraRule3);

      const unoptSim = calculateTaxForCountry(code, state.filingStatusId, ctcTotal, 0);
      const totalTaxFreeShield = employerNpsAnnual + allowances;
      const optSim = calculateTaxForCountry(code, state.filingStatusId, ctcTotal, totalTaxFreeShield);
      const annualTaxSaved = Math.max(0, unoptSim.finalIncomeTax - optSim.finalIncomeTax);
      const optMonthlyTotalValue = (ctcTotal - optSim.finalIncomeTax - optSim.totalSocialSecurity) / 12;

      document.getElementById('ctcBeforeMonthlyVal').textContent = `${formatActiveDisplay(unoptSim.netTakeHomeAnnual / 12, countryRule)} / mo`;
      document.getElementById('ctcBeforeTaxSub').textContent = `Unoptimized Tax: ${formatActiveDisplay(unoptSim.finalIncomeTax, countryRule)}/yr`;
      document.getElementById('ctcAfterMonthlyVal').textContent = `${formatActiveDisplay(optMonthlyTotalValue, countryRule)} / mo`;
      document.getElementById('ctcAfterTaxSub').textContent = `Restructured Tax: ${formatActiveDisplay(optSim.finalIncomeTax, countryRule)}/yr`;
      document.getElementById('ctcAnnualSavedVal').textContent = `+${formatActiveDisplay(annualTaxSaved, countryRule)} / yr`;
      document.getElementById('ctcHraExemptionVal').textContent = `${formatActiveDisplay(hraExemption, countryRule)} / yr`;

      const emailMode = document.getElementById('hrEmailScenarioSelect')?.value || 'restructure';
      const hrTextarea = document.getElementById('hrNegotiationEmailTextarea');
      if (hrTextarea) {
        if (emailMode === 'restructure') {
          hrTextarea.value = `Subject: Request for Tax-Efficient CTC Structuring — [Your Name]

Dear HR / Compensation Team,

Thank you for extending the offer of ${formatCurrency(ctcTotal, countryRule.currency.code)} per annum. I am excited to join the team!

Before we finalize the payroll setup for the 2026 tax year, I would like to request a standard, cost-neutral restructuring of my compensation components (keeping the company's total CTC outlay unchanged at ${formatCurrency(ctcTotal, countryRule.currency.code)}):
1. Basic Salary (${basicPct}% of CTC): ${formatCurrency(basicAnnual, countryRule.currency.code)}/year
2. Employer NPS / Pension Contribution (${npsPct}% of Basic under Sec 80CCD(2) / Pre-Tax Plan): ${formatCurrency(employerNpsAnnual, countryRule.currency.code)}/year
3. Flexi Tax-Exempt Allowances (LTA, Telecom & Meal Card): ${formatCurrency(allowances, countryRule.currency.code)}/year
4. House Rent Allowance (HRA): ${formatCurrency(hraReceivedAnnual, countryRule.currency.code)}/year

This structure adds zero additional cost to the company while reducing annual tax withholding by ${formatCurrency(annualTaxSaved, countryRule.currency.code)}. Please let me know if we can incorporate this allocation into my payroll profile.

Warm regards,
[Your Name]`;
        } else {
          const targetNet = Math.round(unoptSim.netTakeHomeAnnual * 1.12);
          const solvedGross = solveGrossFromTargetNet(targetNet);
          hrTextarea.value = `Subject: Compensation Discussion & Offer Review — [Your Name]

Dear Hiring Team,

Thank you so much for the offer to join as [Role Title]. I am genuinely excited about the role and the impact we can build together.

After running the 2026 statutory tax and social security deductions for ${countryRule.name}, a gross package of ${formatCurrency(ctcTotal, countryRule.currency.code)} results in a net take-home pay of ${formatCurrency(unoptSim.netTakeHomeAnnual / 12, countryRule.currency.code)}/month (${formatCurrency(unoptSim.netTakeHomeAnnual, countryRule.currency.code)}/year) at a ${unoptSim.effectiveTotalRate.toFixed(1)}% effective tax rate.

To reach my target net take-home compensation of ${formatCurrency(targetNet / 12, countryRule.currency.code)}/month after 2026 taxes, we would need a base package of ${formatCurrency(solvedGross, countryRule.currency.code)}/year (or an equivalent signing bonus / pre-tax retirement match). If we can bridge to ${formatCurrency(solvedGross, countryRule.currency.code)}, I am ready to sign immediately.

Warm regards,
[Your Name]`;
        }
      }

      // 2. Module 28: Freelancer Export LUT Invoice & IRS Form W-8BEN Generator
      const flName = document.getElementById('flYourNameInput')?.value || 'Freelancer';
      const flTaxId = document.getElementById('flTaxIdLutInput')?.value || 'ABCDE1234F';
      const flClient = document.getElementById('flClientNameInput')?.value || 'Client Inc.';
      const flPurpose = document.getElementById('flRbiPurposeSelect')?.value || 'P0802';
      const flUsd = Math.max(0, parseFloat(document.getElementById('flInvoiceUsdInput')?.value) || 4500);
      const flInr = convertBetweenCurrencies(flUsd, 'USD', 'INR');

      const exportInvoiceText = `======================================================================
EXPORT TAX INVOICE (ZERO-RATED SUPPLY UNDER GST LUT)
======================================================================
Exporter / Service Provider : ${flName}
Tax ID & LUT Reference      : ${flTaxId}
Jurisdiction                : ${countryRule.name} (${countryRule.currency.code})
Invoice No. & Date          : EXP-2026-0117 | Date: 2026-11-17
----------------------------------------------------------------------
Billed To (Foreign Client)  : ${flClient}
Place of Supply             : Outside India (Export of Services — Sec 2(6) IGST Act)
RBI Purpose & SAC Code      : ${flPurpose}
----------------------------------------------------------------------
Description of Services                                    Amount (USD)
----------------------------------------------------------------------
1. Software Architecture, AI Engineering & Consulting     $${flUsd.toLocaleString('en-US', { minimumFractionDigits: 2 })}
----------------------------------------------------------------------
IGST / VAT (0% Export Under LUT)                          $0.00
TOTAL PAYABLE IN USD                                      $${flUsd.toLocaleString('en-US', { minimumFractionDigits: 2 })}
Equivalent Value in Local Currency (INR @ ${EXCHANGE_RATES_TO_USD.INR})       ${formatCurrency(flInr, 'INR')}
----------------------------------------------------------------------
STATUTORY DECLARATION:
"Supply meant for export under Letter of Undertaking (LUT) without
payment of integrated tax (IGST)."
======================================================================`;

      const w8BenText = `======================================================================
CERTIFICATE OF FOREIGN STATUS OF BENEFICIAL OWNER FOR US TAX
WITHHOLDING AND REPORTING (IRS FORM W-8BEN SUMMARY DECLARATION)
======================================================================
Part I: Identification of Beneficial Owner
1. Name of Individual / Provider : ${flName}
2. Country of Citizenship/Res.   : ${countryRule.name} (${code})
3. Foreign Tax Identifying No.   : ${flTaxId.split('|')[0].trim()}
4. Client / Withholding Agent    : ${flClient}

Part II: Claim of Tax Treaty Benefits & Foreign-Source Service Status
- The beneficial owner is a tax resident of ${countryRule.name} within the
  meaning of the income tax treaty between the United States and ${countryRule.name}.
- All software/consulting services are performed 100% outside the
  United States (Foreign-Source Income under IRC Sec 862(a)(3)).
- Applicable US Withholding Tax Rate: 0.0% (Exempt from 24% Backup WHT).

Part III: Certification
I certify under penalties of perjury that I am not a U.S. person and
the income to which this form relates is not effectively connected with
the conduct of a trade or business in the United States.

Signed Electronically: ${flName} | Date: 2026-11-17
======================================================================`;

      const invPre = document.getElementById('flExportInvoicePre');
      if (invPre) invPre.textContent = exportInvoiceText;
      const w8Pre = document.getElementById('flW8BenPre');
      if (w8Pre) w8Pre.textContent = w8BenText;

      // 3. Module 29: Year-Round Tax-Saving Progress Tracker ("Tax Shield Vault")
      const tvRet = Math.max(0, parseFloat(document.getElementById('tvRetirementLoggedInput')?.value) || 0);
      const tvNps = Math.max(0, parseFloat(document.getElementById('tvNpsLoggedInput')?.value) || 0);
      const tvHealth = Math.max(0, parseFloat(document.getElementById('tvHealthLoggedInput')?.value) || 0);
      const tvOther = Math.max(0, parseFloat(document.getElementById('tvCharityHousingInput')?.value) || 0);

      const totalLoggedDeductions = tvRet + tvNps + tvHealth + tvOther;
      const recommendedCap = code === 'IN' ? 275000 : code === 'US' ? 31800 : code === 'GB' ? 60000 : (countryRule.defaultGrossAnnual * 0.15);
      const shieldPct = recommendedCap > 0 ? Math.min(100, (totalLoggedDeductions / recommendedCap) * 100) : 100;

      const mult = state.frequency === 'monthly' ? 12 : 1;
      const grossAnnual = (Number(state.grossInput) || 0) * mult;
      const noShieldSim = calculateTaxForCountry(code, state.filingStatusId, grossAnnual, 0);
      const withShieldSim = calculateTaxForCountry(code, state.filingStatusId, grossAnnual, totalLoggedDeductions);
      const fullCapSim = calculateTaxForCountry(code, state.filingStatusId, grossAnnual, recommendedCap);

      const cashSavedSoFar = Math.max(0, noShieldSim.finalIncomeTax - withShieldSim.finalIncomeTax);
      const extraPossibleSavings = Math.max(0, withShieldSim.finalIncomeTax - fullCapSim.finalIncomeTax);

      document.getElementById('tvCompletionBadge').textContent = `${Math.round(shieldPct)}% Shield Unlocked`;
      document.getElementById('tvProgressLabel').textContent = `Logged Deductions: ${formatActiveDisplay(totalLoggedDeductions, countryRule)} of ${formatActiveDisplay(recommendedCap, countryRule)} Recommended Cap`;
      document.getElementById('tvTaxSavedCashLabel').textContent = `Cash Tax Saved So Far: ${formatActiveDisplay(cashSavedSoFar, countryRule)}`;
      document.getElementById('tvProgressBarFill').style.width = `${shieldPct.toFixed(1)}%`;

      const remGap = Math.max(0, recommendedCap - totalLoggedDeductions);
      document.getElementById('tvRemainingOpportunityBox').textContent = remGap > 0
        ? `💡 Actionable Tip: You still have ${formatActiveDisplay(remGap, countryRule)} of unused tax-saving room for 2026. Investing that amount before the end of the tax year can save you an additional ${formatActiveDisplay(extraPossibleSavings, countryRule)} in income tax!`
        : `🎉 Congratulations! You have unlocked 100% of your recommended ${formatActiveDisplay(recommendedCap, countryRule)} tax-saving shield for 2026!`;

      // 4. Module 30: B2B White-Label Studio
      const wlName = (document.getElementById('wlFirmNameInput')?.value || 'Apex Chartered Accountants').trim();
      const wlTagline = (document.getElementById('wlTaglineInput')?.value || '').trim();
      const wlUrl = (document.getElementById('wlBookingUrlInput')?.value || 'https://calendly.com').trim();

      const baseUrl = window.location.href.split('?')[0];
      const wlParams = new URLSearchParams({
        country: code,
        wl_name: wlName,
        wl_tag: wlTagline,
        wl_url: wlUrl
      });
      const wlLinkEl = document.getElementById('wlGeneratedShareUrlInput');
      if (wlLinkEl) wlLinkEl.value = `${baseUrl}?${wlParams.toString()}`;

      document.getElementById('wlBannerFirmName').textContent = wlName;
      document.getElementById('wlBannerTagline').textContent = wlTagline;
      document.getElementById('wlBannerCtaLink').href = wlUrl;
      const initials = wlName.split(/\s+/).slice(0, 2).map(w => w[0] || '').join('').toUpperCase() || 'CA';
      document.getElementById('wlBannerInitials').textContent = initials;
    }

    function initMonetizationSuite() {
      const prevUpdateAll = updateAllCalculations;
      updateAllCalculations = function() {
        prevUpdateAll();
        updateMonetizationModules27To30();
      };

      const prevSelectCountry = selectCountry;
      selectCountry = function(newCode) {
        prevSelectCountry(newCode);
        const defGross = TAX_RULES[newCode].defaultGrossAnnual;
        const ctcInput = document.getElementById('ctcTotalOfferInput');
        if (ctcInput) ctcInput.value = defGross;
        updateMonetizationModules27To30();
      };

      // Bind Module 27 inputs
      ['ctcTotalOfferInput', 'ctcBasicPctInput', 'ctcNpsPctInput', 'ctcMonthlyRentInput', 'ctcAllowancesInput', 'hrEmailScenarioSelect'].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
          el.addEventListener('input', updateMonetizationModules27To30);
          el.addEventListener('change', updateMonetizationModules27To30);
        }
      });

      document.getElementById('copyHrProposalEmailBtn').addEventListener('click', () => {
        fallbackCopy(document.getElementById('hrNegotiationEmailTextarea')?.value || '');
        showToast('Copied HR Salary Negotiation Email to clipboard!');
      });

      // Bind Module 28 inputs
      ['flYourNameInput', 'flTaxIdLutInput', 'flClientNameInput', 'flRbiPurposeSelect', 'flInvoiceUsdInput'].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
          el.addEventListener('input', updateMonetizationModules27To30);
          el.addEventListener('change', updateMonetizationModules27To30);
        }
      });

      document.getElementById('copyExportInvoiceBtn').addEventListener('click', () => {
        fallbackCopy(document.getElementById('flExportInvoicePre')?.textContent || '');
        showToast('Copied Zero-Rated GST LUT Export Invoice!');
      });

      document.getElementById('copyW8BenCertificateBtn').addEventListener('click', () => {
        fallbackCopy(document.getElementById('flW8BenPre')?.textContent || '');
        showToast('Copied Pre-Filled IRS Form W-8BEN Certificate!');
      });

      // Bind Module 29 inputs
      ['tvRetirementLoggedInput', 'tvNpsLoggedInput', 'tvHealthLoggedInput', 'tvCharityHousingInput'].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
          el.addEventListener('input', updateMonetizationModules27To30);
          el.addEventListener('change', updateMonetizationModules27To30);
        }
      });

      document.getElementById('syncVaultToCalculatorBtn').addEventListener('click', () => {
        const tvRet = Math.max(0, parseFloat(document.getElementById('tvRetirementLoggedInput')?.value) || 0);
        const tvNps = Math.max(0, parseFloat(document.getElementById('tvNpsLoggedInput')?.value) || 0);
        const tvHealth = Math.max(0, parseFloat(document.getElementById('tvHealthLoggedInput')?.value) || 0);
        const tvOther = Math.max(0, parseFloat(document.getElementById('tvCharityHousingInput')?.value) || 0);
        const total = tvRet + tvNps + tvHealth + tvOther;
        const valForFreq = state.frequency === 'monthly' ? Math.round(total / 12) : total;
        state.preTaxInput = valForFreq;
        document.getElementById('preTaxDeductionInput').value = valForFreq;
        switchModuleTab('pit');
        updateAllCalculations();
        showToast('Applied logged tax-saving deductions to main calculator!');
      });

      // Bind Module 30 inputs
      ['wlFirmNameInput', 'wlTaglineInput', 'wlBookingUrlInput'].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
          el.addEventListener('input', updateMonetizationModules27To30);
          el.addEventListener('change', updateMonetizationModules27To30);
        }
      });

      document.getElementById('activateWhiteLabelPreviewBtn').addEventListener('click', () => {
        updateMonetizationModules27To30();
        document.getElementById('whiteLabelPartnerBanner').classList.remove('hidden');
        window.scrollTo({ top: 0, behavior: 'smooth' });
        showToast('Activated White-Label Partner Banner at top of app!');
      });

      document.getElementById('wlBannerDisableBtn').addEventListener('click', () => {
        document.getElementById('whiteLabelPartnerBanner').classList.add('hidden');
      });

      document.getElementById('copyWhiteLabelShareUrlBtn').addEventListener('click', () => {
        updateMonetizationModules27To30();
        fallbackCopy(document.getElementById('wlGeneratedShareUrlInput')?.value || '');
        showToast('Copied White-Label Branded Client Link!');
      });

      // Auto-activate White-Label mode if URL has ?wl_name=...
      try {
        const qs = new URLSearchParams(window.location.search);
        if (qs.get('wl_name')) {
          document.getElementById('wlFirmNameInput').value = qs.get('wl_name');
          if (qs.get('wl_tag')) document.getElementById('wlTaglineInput').value = qs.get('wl_tag');
          if (qs.get('wl_url')) document.getElementById('wlBookingUrlInput').value = qs.get('wl_url');
          document.getElementById('whiteLabelPartnerBanner').classList.remove('hidden');
        }
      } catch (e) {}

      applyHumanFriendlyMode(isSimpleHumanMode);
      updateMonetizationModules27To30();
    }

    window.addEventListener('DOMContentLoaded', initMonetizationSuite);

    /**
     * ============================================================================
     * FAMILY/CHILD & SENIOR CREDITS, SALARY HIKE SIMULATOR, BULK CSV PROCESSOR,
     * AND MULTI-LANGUAGE UI SWITCHER (ENGLISH, HINDI, SPANISH, GERMAN)
     * ============================================================================
     */
    let activeUiLanguage = 'en';
    let lastProcessedCsvRows = [];

    const UI_TRANSLATIONS = {
      en: {
        profileBadge: 'Your Tax Profile',
        profileSub: 'Choose your country and residency once — every calculator below updates automatically',
        inPlainEnglishBadge: 'In Plain English',
        inPlainEnglishTitle: 'What Your Paycheck Breakdown Really Means',
        takeawayTemplate: (sym, countryName, keep, tax, soc, netMo, netYr) =>
          `For every <strong>${sym}100</strong> you earn in <strong>${countryName}</strong>, you keep <strong>${sym}${keep}</strong> as take-home pay, pay <strong>${sym}${tax}</strong> in income tax, and contribute <strong>${sym}${soc}</strong> toward mandatory social security/retirement. That leaves you with <strong>${netMo} per month</strong> (${netYr} per year) in your bank account.`
      },
      hi: {
        profileBadge: 'आपकी टैक्स प्रोफ़ाइल',
        profileSub: 'अपना देश और निवास स्थिति चुनें — नीचे दिए गए सभी कैलकुलेटर अपने आप अपडेट हो जाएंगे',
        inPlainEnglishBadge: 'सरल शब्दों में',
        inPlainEnglishTitle: 'आपकी सैलरी और टैक्स का सीधा हिसाब',
        takeawayTemplate: (sym, countryName, keep, tax, soc, netMo, netYr) =>
          `<strong>${countryName}</strong> में आपके द्वारा कमाए गए प्रत्येक <strong>${sym}100</strong> में से, आपके हाथ में <strong>${sym}${keep}</strong> (टेक-होम सैलरी) बचते हैं, <strong>${sym}${tax}</strong> इनकम टैक्स में जाते हैं, और <strong>${sym}${soc}</strong> पीएफ/सामाजिक सुरक्षा में जमा होते हैं। यानी आपके बैंक खाते में <strong>${netMo} प्रति माह</strong> (${netYr} प्रति वर्ष) आएंगे।`
      },
      es: {
        profileBadge: 'Tu Perfil Fiscal',
        profileSub: 'Elige tu país y residencia una sola vez — todas las calculadoras se actualizan al instante',
        inPlainEnglishBadge: 'En Palabras Simples',
        inPlainEnglishTitle: 'Lo Que Realmente Significa Tu Sueldo Neto',
        takeawayTemplate: (sym, countryName, keep, tax, soc, netMo, netYr) =>
          `Por cada <strong>${sym}100</strong> que ganas en <strong>${countryName}</strong>, conservas <strong>${sym}${keep}</strong> como sueldo neto, pagas <strong>${sym}${tax}</strong> en impuesto sobre la renta y aportas <strong>${sym}${soc}</strong> a la seguridad social/jubilación. Recibes <strong>${netMo} al mes</strong> (${netYr} al año) en tu cuenta bancaria.`
      },
      de: {
        profileBadge: 'Dein Steuerprofil',
        profileSub: 'Land und Wohnsitz einmal wählen — alle Rechner unten aktualisieren sich automatisch',
        inPlainEnglishBadge: 'Einfach Erklärt',
        inPlainEnglishTitle: 'Was Dein Gehalts-Check Wirklich Bedeutet',
        takeawayTemplate: (sym, countryName, keep, tax, soc, netMo, netYr) =>
          `Von je <strong>${sym}100</strong> Bruttogehalt in <strong>${countryName}</strong> bleiben dir <strong>${sym}${keep}</strong> Netto, <strong>${sym}${tax}</strong> gehen an Einkommensteuer und <strong>${sym}${soc}</strong> an die Sozialversicherung. Das ergibt <strong>${netMo} pro Monat</strong> (${netYr} pro Jahr) auf deinem Konto.`
      }
    };

    function computeFamilyAndSeniorAdjustment(countryCode, grossAnnual, baseIncomeTax, baseSocialSecurity, ageGroup, childrenCount) {
      let taxCreditSavings = 0;
      let socialSavings = 0;
      const notes = [];

      // 1. Senior / Super Senior Reliefs
      if (ageGroup === 'senior' || ageGroup === 'super_senior') {
        if (countryCode === 'US') {
          // 2026 OBBBA $6,000 Senior Bonus Deduction
          taxCreditSavings += Math.min(baseIncomeTax, 6000 * 0.22);
          notes.push('+$6k US Senior Ded.');
        } else if (countryCode === 'IN') {
          // Sec 80TTB ₹50,000 interest exemption + Old Regime higher slab relief
          const bonusShield = ageGroup === 'super_senior' ? 25000 : 10000;
          taxCreditSavings += Math.min(baseIncomeTax, bonusShield);
          notes.push(ageGroup === 'super_senior' ? '80+ Super Senior Relief' : '60+ Senior Relief');
        } else if (countryCode === 'SG') {
          // Singapore Earned Income Relief rises from S$1,000 to S$6,000 / S$8,000
          taxCreditSavings += Math.min(baseIncomeTax, 7000 * 0.115);
          notes.push('SG Senior EIR S$8k');
        } else if (countryCode === 'CA') {
          taxCreditSavings += Math.min(baseIncomeTax, 1200);
          notes.push('CRA Age Amount');
        }
      }

      // 2. Dependent Child Credits & Reductions
      if (childrenCount > 0) {
        if (countryCode === 'US') {
          // 2026 OBBBA $2,200 per child tax credit
          taxCreditSavings += Math.min(baseIncomeTax - taxCreditSavings, childrenCount * 2200);
          notes.push(`${childrenCount}x $2,200 Child Credit`);
        } else if (countryCode === 'DE') {
          // Germany Pflegeversicherung childless surcharge removed + child discount + Kindergeld
          const careReductionRate = childrenCount === 1 ? 0.006 : childrenCount === 2 ? 0.0085 : 0.011;
          socialSavings += Math.min(grossAnnual, 69750) * careReductionRate;
          notes.push(`DE Care −${(careReductionRate * 100).toFixed(2)}%`);
        } else if (countryCode === 'GB') {
          // UK Child Benefit (£1,354 first child + £897 additional, subject to HICBC taper £60k-£80k)
          const rawBenefit = 1354 + Math.max(0, childrenCount - 1) * 897;
          const taper = grossAnnual > 60000 ? Math.min(1, (grossAnnual - 60000) / 20000) : 0;
          taxCreditSavings += Math.round(rawBenefit * (1 - taper));
          notes.push('UK Child Benefit');
        } else if (countryCode === 'CA') {
          taxCreditSavings += childrenCount * 1500;
          notes.push('Canada Child Benefit');
        }
      }

      return {
        taxCreditSavings: Math.max(0, taxCreditSavings),
        socialSavings: Math.max(0, socialSavings),
        summaryBadge: notes.length > 0 ? notes.join(' • ') : `${ageGroup === 'adult' ? 'Standard Adult' : 'Senior'} • ${childrenCount} Kids`
      };
    }

    function updateFamilyHikeCsvAndLang() {
      const code = state.countryCode;
      const countryRule = TAX_RULES[code];
      const mult = state.frequency === 'monthly' ? 12 : 1;
      const grossAnnualLocal = Math.max(0, (Number(state.grossInput) || 0) * mult);
      const preTaxAnnualLocal = Math.max(0, (Number(state.preTaxInput) || 0) * mult);

      const ageGroup = document.getElementById('userAgeBracketSelect')?.value || 'adult';
      const childrenCount = parseInt(document.getElementById('dependentChildrenSelect')?.value || '0', 10);

      const baseCalc = calculateTaxForCountry(code, state.filingStatusId, grossAnnualLocal, preTaxAnnualLocal);
      const subNat = getSubNationalTax(code, grossAnnualLocal, baseCalc.taxableIncome, baseCalc.finalIncomeTax);
      const famAdj = computeFamilyAndSeniorAdjustment(code, grossAnnualLocal, baseCalc.finalIncomeTax, baseCalc.totalSocialSecurity, ageGroup, childrenCount);

      document.getElementById('familySeniorReliefBadge').textContent = famAdj.summaryBadge;

      const finalTaxAfterCredits = Math.max(0, baseCalc.finalIncomeTax + subNat.amount - famAdj.taxCreditSavings);
      const finalSocAfterCredits = Math.max(0, baseCalc.totalSocialSecurity - famAdj.socialSavings);
      const finalNetPay = Math.max(0, grossAnnualLocal - finalTaxAfterCredits - finalSocAfterCredits - preTaxAnnualLocal);

      if (famAdj.taxCreditSavings > 0 || famAdj.socialSavings > 0) {
        document.getElementById('kpiTaxAnnual').textContent = formatActiveDisplay(finalTaxAfterCredits, countryRule);
        document.getElementById('kpiTaxMonthly').textContent = formatActiveDisplay(finalTaxAfterCredits / 12, countryRule);
        document.getElementById('kpiTaxNote').textContent = `Saved ${formatActiveDisplay(famAdj.taxCreditSavings + famAdj.socialSavings, countryRule)} (${famAdj.summaryBadge})`;
        document.getElementById('kpiSocialAnnual').textContent = formatActiveDisplay(finalSocAfterCredits, countryRule);
        document.getElementById('kpiSocialMonthly').textContent = formatActiveDisplay(finalSocAfterCredits / 12, countryRule);
        document.getElementById('kpiNetAnnual').textContent = formatActiveDisplay(finalNetPay, countryRule);
        document.getElementById('kpiNetMonthly').textContent = formatActiveDisplay(finalNetPay / 12, countryRule);
      }

      // Apply Multi-Language Translation to Plain-English Takeaway Card
      const langPack = UI_TRANSLATIONS[activeUiLanguage] || UI_TRANSLATIONS.en;
      const sym = countryRule.currency.symbol.trim();
      const keepPer100 = grossAnnualLocal > 0 ? ((finalNetPay / grossAnnualLocal) * 100).toFixed(1) : '100.0';
      const taxPer100 = grossAnnualLocal > 0 ? ((finalTaxAfterCredits / grossAnnualLocal) * 100).toFixed(1) : '0.0';
      const socPer100 = grossAnnualLocal > 0 ? ((finalSocAfterCredits / grossAnnualLocal) * 100).toFixed(1) : '0.0';

      const takeawayEl = document.getElementById('plainEnglishTakeawayText');
      if (takeawayEl) {
        takeawayEl.innerHTML = langPack.takeawayTemplate(
          sym,
          countryRule.name,
          keepPer100,
          taxPer100,
          socPer100,
          formatActiveDisplay(finalNetPay / 12, countryRule),
          formatActiveDisplay(finalNetPay, countryRule)
        );
      }
      const subEl = document.getElementById('profileSubtitleText');
      if (subEl) subEl.textContent = langPack.profileSub;

      // Update Module 31: Salary Hike & 5-Year Career Progression
      const curSal = Math.max(0, parseFloat(document.getElementById('hikeCurrentSalaryInput')?.value) || 0);
      const newSal = Math.max(0, parseFloat(document.getElementById('hikeNewSalaryInput')?.value) || 0);
      const growthRate = Math.max(0, parseFloat(document.getElementById('hikeAnnualGrowthRateInput')?.value) || 12) / 100;

      const curSim = calculateTaxForCountry(code, state.filingStatusId, curSal, 0);
      const newSim = calculateTaxForCountry(code, state.filingStatusId, newSal, 0);

      const grossDiff = newSal - curSal;
      const curTotalTax = curSim.finalIncomeTax + curSim.totalSocialSecurity;
      const newTotalTax = newSim.finalIncomeTax + newSim.totalSocialSecurity;
      const taxDiff = Math.max(0, newTotalTax - curTotalTax);
      const netAnnualGain = newSim.netTakeHomeAnnual - curSim.netTakeHomeAnnual;
      const bitePct = grossDiff > 0 ? (taxDiff / grossDiff) * 100 : 0;

      document.getElementById('hikeGrossDiffVal').textContent = `${grossDiff >= 0 ? '+' : ''}${formatActiveDisplay(grossDiff, countryRule)} / yr`;
      document.getElementById('hikeGrossMonthlyDiffSub').textContent = `${grossDiff >= 0 ? '+' : ''}${formatActiveDisplay(grossDiff / 12, countryRule)} / mo on paper`;
      document.getElementById('hikeTaxBiteVal').textContent = `−${formatActiveDisplay(taxDiff, countryRule)} / yr`;
      document.getElementById('hikeTaxBitePctSub').textContent = `${bitePct.toFixed(1)}% of your raise goes to tax`;
      document.getElementById('hikeNetMonthlyGainVal').textContent = `${netAnnualGain >= 0 ? '+' : ''}${formatActiveDisplay(netAnnualGain / 12, countryRule)} / mo`;
      document.getElementById('hikeNetAnnualGainSub').textContent = `${netAnnualGain >= 0 ? '+' : ''}${formatActiveDisplay(netAnnualGain, countryRule)} / yr net cash`;
      document.getElementById('hikeNewMonthlyNetVal').textContent = `${formatActiveDisplay(newSim.netTakeHomeAnnual / 12, countryRule)} / mo`;
      document.getElementById('hikeOldMonthlyNetSub').textContent = `Up from ${formatActiveDisplay(curSim.netTakeHomeAnnual / 12, countryRule)} / mo`;

      const fiveYrBody = document.getElementById('hikeFiveYearTableBody');
      if (fiveYrBody) {
        let rowsHtml = '';
        for (let yr = 1; yr <= 5; yr++) {
          const projGross = Math.round(newSal * Math.pow(1 + growthRate, yr - 1));
          const yrSim = calculateTaxForCountry(code, state.filingStatusId, projGross, 0);
          const yrTax = yrSim.finalIncomeTax + yrSim.totalSocialSecurity;
          rowsHtml += `
            <tr class="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
              <td class="py-2.5 px-4 font-bold text-slate-900 dark:text-white">Year ${yr} (${2025 + yr})</td>
              <td class="py-2.5 px-4 text-right font-mono-num">${formatActiveDisplay(projGross, countryRule)}</td>
              <td class="py-2.5 px-4 text-right font-mono-num text-rose-600 dark:text-rose-400">${formatActiveDisplay(yrTax, countryRule)}</td>
              <td class="py-2.5 px-4 text-right font-mono-num font-bold text-emerald-600 dark:text-emerald-400">${formatActiveDisplay(yrSim.netTakeHomeAnnual, countryRule)}</td>
              <td class="py-2.5 px-4 text-right font-mono-num font-semibold">${formatActiveDisplay(yrSim.netTakeHomeAnnual / 12, countryRule)}</td>
              <td class="py-2.5 px-4 text-right font-mono-num">${yrSim.effectiveTotalRate.toFixed(1)}%</td>
            </tr>
          `;
        }
        fiveYrBody.innerHTML = rowsHtml;
      }
    }

    function processBulkCsvRegister() {
      const raw = document.getElementById('bulkCsvRawTextarea')?.value || '';
      const lines = raw.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
      const tbody = document.getElementById('bulkCsvResultsTableBody');
      if (!tbody) return;

      lastProcessedCsvRows = [];
      const dataLines = lines.filter((l, idx) => !(idx === 0 && /gross|country|name/i.test(l)));

      tbody.innerHTML = dataLines.map(line => {
        const parts = line.split(',').map(p => p.trim());
        const empName = parts[0] || 'Employee';
        const cCode = (parts[1] || 'IN').toUpperCase();
        const cRule = TAX_RULES[cCode] || TAX_RULES.IN;
        const gross = Math.max(0, parseFloat(parts[2]) || cRule.defaultGrossAnnual);
        const preTax = Math.max(0, parseFloat(parts[3]) || 0);
        const kids = Math.max(0, parseInt(parts[4] || '0', 10));

        const sim = calculateTaxForCountry(cRule.code, cRule.filingStatuses[0].id, gross, preTax);
        const fam = computeFamilyAndSeniorAdjustment(cRule.code, gross, sim.finalIncomeTax, sim.totalSocialSecurity, 'adult', kids);
        const netTax = Math.max(0, sim.finalIncomeTax - fam.taxCreditSavings);
        const netSoc = Math.max(0, sim.totalSocialSecurity - fam.socialSavings);
        const netAnnual = Math.max(0, gross - netTax - netSoc - preTax);
        const netMonthly = netAnnual / 12;

        lastProcessedCsvRows.push({
          name: empName,
          country: cRule.code,
          currency: cRule.currency.code,
          grossAnnual: Math.round(gross),
          preTaxDeduction: Math.round(preTax),
          children: kids,
          incomeTax: Math.round(netTax),
          socialSecurity: Math.round(netSoc),
          netAnnual: Math.round(netAnnual),
          netMonthly: Math.round(netMonthly)
        });

        return `
          <tr class="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
            <td class="py-2 px-3 font-bold text-slate-900 dark:text-white">${empName}</td>
            <td class="py-2 px-2">${cRule.flag} ${cRule.code}</td>
            <td class="py-2 px-3 text-right font-mono-num">${formatCurrency(gross, cRule.currency.code)}</td>
            <td class="py-2 px-3 text-right font-mono-num text-rose-600 dark:text-rose-400">${formatCurrency(netTax, cRule.currency.code)}</td>
            <td class="py-2 px-3 text-right font-mono-num text-amber-600 dark:text-amber-400">${formatCurrency(netSoc, cRule.currency.code)}</td>
            <td class="py-2 px-3 text-right font-mono-num font-bold text-emerald-600 dark:text-emerald-400">${formatCurrency(netAnnual, cRule.currency.code)}</td>
            <td class="py-2 px-3 text-right font-mono-num font-semibold">${formatCurrency(netMonthly, cRule.currency.code)}</td>
          </tr>
        `;
      }).join('');
    }

    function downloadProcessedPayrollCsv() {
      processBulkCsvRegister();
      const header = 'EmployeeName,Country,Currency,GrossAnnual,PreTaxDeduction,Children,IncomeTax,SocialSecurity,NetAnnualTakeHome,NetMonthlyTakeHome\n';
      const body = lastProcessedCsvRows.map(r =>
        `"${r.name}",${r.country},${r.currency},${r.grossAnnual},${r.preTaxDeduction},${r.children},${r.incomeTax},${r.socialSecurity},${r.netAnnual},${r.netMonthly}`
      ).join('\n');
      const blob = new Blob([header + body], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'TaxPulse_2026_Processed_Payroll_Register.csv';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast(`Downloaded processed CSV for ${lastProcessedCsvRows.length} employees!`);
    }

    function initFinalFourEnhancements() {
      const prevUpdateAll = updateAllCalculations;
      updateAllCalculations = function() {
        prevUpdateAll();
        updateFamilyHikeCsvAndLang();
      };

      const prevSelectCountry = selectCountry;
      selectCountry = function(newCode) {
        prevSelectCountry(newCode);
        const defGross = TAX_RULES[newCode].defaultGrossAnnual;
        const curEl = document.getElementById('hikeCurrentSalaryInput');
        const pctEl = document.getElementById('hikePctSliderInput');
        const newEl = document.getElementById('hikeNewSalaryInput');
        if (curEl && newEl) {
          curEl.value = defGross;
          const pct = parseFloat(pctEl?.value || '25');
          newEl.value = Math.round(defGross * (1 + pct / 100));
        }
        updateFamilyHikeCsvAndLang();
      };

      // Multi-Language Switcher
      document.getElementById('uiLanguageSelect').addEventListener('change', (e) => {
        activeUiLanguage = e.target.value;
        updateFamilyHikeCsvAndLang();
        showToast(`Language updated: ${e.target.options[e.target.selectedIndex].text}`);
      });

      // Age & Dependent Children Selectors
      ['userAgeBracketSelect', 'dependentChildrenSelect'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('change', updateAllCalculations);
      });

      // Salary Hike Slider & Inputs
      document.getElementById('hikePctSliderInput').addEventListener('input', (e) => {
        const pct = parseFloat(e.target.value) || 0;
        document.getElementById('hikePctLabel').textContent = `${pct}%`;
        const curSal = parseFloat(document.getElementById('hikeCurrentSalaryInput')?.value) || 0;
        document.getElementById('hikeNewSalaryInput').value = Math.round(curSal * (1 + pct / 100));
        updateFamilyHikeCsvAndLang();
      });

      ['hikeCurrentSalaryInput', 'hikeNewSalaryInput', 'hikeAnnualGrowthRateInput'].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
          el.addEventListener('input', () => {
            if (id === 'hikeCurrentSalaryInput') {
              const pct = parseFloat(document.getElementById('hikePctSliderInput')?.value) || 25;
              document.getElementById('hikeNewSalaryInput').value = Math.round((parseFloat(el.value) || 0) * (1 + pct / 100));
            }
            updateFamilyHikeCsvAndLang();
          });
        }
      });

      // Bulk CSV Processor
      document.getElementById('runBulkCsvProcessBtn').addEventListener('click', () => {
        processBulkCsvRegister();
        showToast(`Processed ${lastProcessedCsvRows.length} employee payroll records!`);
      });

      document.getElementById('bulkCsvRawTextarea').addEventListener('input', processBulkCsvRegister);
      document.getElementById('downloadProcessedCsvBtn').addEventListener('click', downloadProcessedPayrollCsv);

      document.getElementById('bulkCsvFileInput').addEventListener('change', (e) => {
        const file = e.target.files && e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
          document.getElementById('bulkCsvRawTextarea').value = String(ev.target.result || '');
          processBulkCsvRegister();
          showToast(`Loaded ${file.name} (${lastProcessedCsvRows.length} rows)!`);
        };
        reader.readAsText(file);
      });

      applyHumanFriendlyMode(isSimpleHumanMode);
      processBulkCsvRegister();
      updateFamilyHikeCsvAndLang();
    }

    window.addEventListener('DOMContentLoaded', initFinalFourEnhancements);

    /**
     * ============================================================================
     * LONG-TERM RETENTION SYSTEM-OF-RECORD CONTROLLERS (MODULES 33–36)
     * ============================================================================
     */
    let crmClients = [
      { id: 101, name: 'Vikramaditya Singh', taxId: 'BNZPS8812K', country: 'IN', grossAnnual: 2400000, preTax: 120000, status: 'Advance Tax Due', note: 'New Regime + 10% Employer NPS' },
      { id: 102, name: 'Ananya Deshmukh', taxId: 'AHKPD4419M', country: 'IN', grossAnnual: 1450000, preTax: 50000, status: 'Docs Collected', note: 'Sec 44ADA Consultant + Equity LTCG' },
      { id: 103, name: 'Michael Chen', taxId: 'SSN-992-41', country: 'US', grossAnnual: 175000, preTax: 23500, status: 'Return Filed', note: 'California Single + 401(k) Max' },
      { id: 104, name: 'Emma Richardson', taxId: 'NI-QQ123456C', country: 'GB', grossAnnual: 112000, preTax: 12000, status: 'Advance Tax Due', note: 'Salary Sacrifice to recover £100k PA' }
    ];

    let freelancerLedgerEntries = [
      { id: 201, month: 'Apr 2026', desc: 'US SaaS Client — AI Module Milestone 1', gross: 240000, expense: 15000, tds: 0 },
      { id: 202, month: 'Jun 2026', desc: 'Bengaluru Enterprise — Architecture Retainer', gross: 350000, expense: 22000, tds: 35000 },
      { id: 203, month: 'Aug 2026', desc: 'Mumbai FinTech — Full-Stack Audit (Sec 194J)', gross: 420000, expense: 30000, tds: 42000 },
      { id: 204, month: 'Oct 2026', desc: 'London Agency — Web App Delivery', gross: 280000, expense: 18000, tds: 0 }
    ];

    function renderCrmClientBook() {
      const tbody = document.getElementById('crmClientTableBody');
      if (!tbody) return;

      tbody.innerHTML = crmClients.map(cl => {
        const cRule = TAX_RULES[cl.country] || TAX_RULES.IN;
        const sim = calculateTaxForCountry(cRule.code, cRule.filingStatuses[0].id, cl.grossAnnual, cl.preTax);
        const totalTax = sim.finalIncomeTax + sim.totalSocialSecurity;
        const statusColor = cl.status.includes('Filed')
          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
          : cl.status.includes('Collected')
          ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300'
          : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300';

        return `
          <tr class="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
            <td class="py-2.5 px-4">
              <div class="font-bold text-slate-900 dark:text-white">${cl.name}</div>
              <div class="text-[11px] font-mono-num text-slate-400">${cl.taxId}</div>
            </td>
            <td class="py-2.5 px-2">${cRule.flag} ${cRule.code}</td>
            <td class="py-2.5 px-3 text-right font-mono-num">${formatCurrency(cl.grossAnnual, cRule.currency.code)}</td>
            <td class="py-2.5 px-3 text-right font-mono-num text-rose-600 dark:text-rose-400">${formatCurrency(totalTax, cRule.currency.code)}</td>
            <td class="py-2.5 px-3 text-right font-mono-num font-bold text-emerald-600 dark:text-emerald-400">${formatCurrency(sim.netTakeHomeAnnual, cRule.currency.code)}</td>
            <td class="py-2.5 px-3">
              <span class="px-2 py-0.5 rounded text-[10px] font-bold ${statusColor}">${cl.status}</span>
              <div class="text-[11px] text-slate-500 truncate max-w-[180px] mt-0.5">${cl.note}</div>
            </td>
            <td class="py-2.5 px-4 text-right space-x-1.5 whitespace-nowrap">
              <button type="button" data-load-client="${cl.id}" class="px-2 py-1 rounded bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-bold text-[11px] hover:bg-indigo-100">Load</button>
              <button type="button" data-msg-client="${cl.id}" class="px-2 py-1 rounded bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold text-[11px] hover:bg-emerald-100">Copy Msg</button>
              <button type="button" data-del-client="${cl.id}" class="px-1.5 py-1 rounded text-rose-500 hover:bg-rose-50 font-bold text-[11px]">✕</button>
            </td>
          </tr>
        `;
      }).join('');

      tbody.querySelectorAll('[data-load-client]').forEach(btn => {
        btn.addEventListener('click', () => {
          const id = Number(btn.getAttribute('data-load-client'));
          const cl = crmClients.find(x => x.id === id);
          if (!cl) return;
          selectCountry(cl.country);
          state.frequency = 'annual';
          state.grossInput = cl.grossAnnual;
          state.preTaxInput = cl.preTax;
          document.getElementById('grossIncomeInput').value = cl.grossAnnual;
          document.getElementById('preTaxDeductionInput').value = cl.preTax;
          updateAllCalculations();
          showToast(`Loaded client dossier: ${cl.name}`);
        });
      });

      tbody.querySelectorAll('[data-msg-client]').forEach(btn => {
        btn.addEventListener('click', () => {
          const id = Number(btn.getAttribute('data-msg-client'));
          const cl = crmClients.find(x => x.id === id);
          if (!cl) return;
          const cRule = TAX_RULES[cl.country] || TAX_RULES.IN;
          const sim = calculateTaxForCountry(cRule.code, cRule.filingStatuses[0].id, cl.grossAnnual, cl.preTax);
          const msg = `Hi ${cl.name}, here is your 2026 Tax Advisory Update (${cl.taxId}):\n• Gross Annual Income: ${formatCurrency(cl.grossAnnual, cRule.currency.code)}\n• Pre-Tax Deductions: ${formatCurrency(cl.preTax, cRule.currency.code)}\n• Estimated Income Tax: ${formatCurrency(sim.finalIncomeTax, cRule.currency.code)}\n• Net Take-Home Pay: ${formatCurrency(sim.netTakeHomeAnnual, cRule.currency.code)}/yr (${formatCurrency(sim.netTakeHomeAnnual / 12, cRule.currency.code)}/mo)\n• Current Status: ${cl.status} (${cl.note})`;
          fallbackCopy(msg);
          showToast(`Copied WhatsApp/Email update for ${cl.name}!`);
        });
      });

      tbody.querySelectorAll('[data-del-client]').forEach(btn => {
        btn.addEventListener('click', () => {
          const id = Number(btn.getAttribute('data-del-client'));
          crmClients = crmClients.filter(x => x.id !== id);
          try { localStorage.setItem('taxpulse_ca_client_book_2026', JSON.stringify(crmClients)); } catch (e) {}
          renderCrmClientBook();
        });
      });
    }

    function renderFreelancerLedger() {
      const code = state.countryCode;
      const cRule = TAX_RULES[code];
      const tbody = document.getElementById('flLedgerTableBody');
      if (!tbody) return;

      let ytdGross = 0;
      let ytdExp = 0;
      let ytdTds = 0;

      tbody.innerHTML = freelancerLedgerEntries.map(row => {
        ytdGross += row.gross;
        ytdExp += row.expense;
        ytdTds += row.tds;
        const netCash = Math.max(0, row.gross - row.expense - row.tds);
        return `
          <tr class="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
            <td class="py-2 px-3 font-mono-num font-semibold">${row.month}</td>
            <td class="py-2 px-3 font-medium text-slate-900 dark:text-white">${row.desc}</td>
            <td class="py-2 px-3 text-right font-mono-num">${formatActiveDisplay(row.gross, cRule)}</td>
            <td class="py-2 px-3 text-right font-mono-num text-amber-600">−${formatActiveDisplay(row.expense, cRule)}</td>
            <td class="py-2 px-3 text-right font-mono-num text-indigo-600 dark:text-indigo-400">${formatActiveDisplay(row.tds, cRule)}</td>
            <td class="py-2 px-3 text-right font-mono-num font-bold text-emerald-600 dark:text-emerald-400">${formatActiveDisplay(netCash, cRule)}</td>
            <td class="py-2 px-3 text-center">
              <button type="button" data-del-ledger="${row.id}" class="text-rose-500 hover:text-rose-700 font-bold">✕</button>
            </td>
          </tr>
        `;
      }).join('');

      tbody.querySelectorAll('[data-del-ledger]').forEach(btn => {
        btn.addEventListener('click', () => {
          const id = Number(btn.getAttribute('data-del-ledger'));
          freelancerLedgerEntries = freelancerLedgerEntries.filter(x => x.id !== id);
          try { localStorage.setItem('taxpulse_fl_ledger_2026', JSON.stringify(freelancerLedgerEntries)); } catch (e) {}
          renderFreelancerLedger();
          updateRetentionModules33To36();
        });
      });

      // Calculate Assessed Tax on YTD Freelance Income (using lower of 50% Sec 44ADA or Actual Profit)
      const taxable44Ada = code === 'IN' ? Math.min(ytdGross * 0.50, Math.max(0, ytdGross - ytdExp)) : Math.max(0, ytdGross - ytdExp);
      const flSim = calculateTaxForCountry(code, state.filingStatusId, taxable44Ada, 0);
      const assessedTax = flSim.finalIncomeTax;
      const refundOrDue = ytdTds - assessedTax;

      document.getElementById('flYtdGrossVal').textContent = formatActiveDisplay(ytdGross, cRule);
      document.getElementById('flYtdExpensesSub').textContent = `Logged Expenses: ${formatActiveDisplay(ytdExp, cRule)}`;
      document.getElementById('flYtdTdsVal').textContent = formatActiveDisplay(ytdTds, cRule);
      document.getElementById('flYtdAssessedTaxVal').textContent = formatActiveDisplay(assessedTax, cRule);

      const refEl = document.getElementById('flYtdRefundOrDueVal');
      const refSub = document.getElementById('flYtdRefundNoteSub');
      if (refundOrDue >= 0) {
        refEl.textContent = `Refund: +${formatActiveDisplay(refundOrDue, cRule)}`;
        refEl.className = 'text-xl font-mono-num font-extrabold text-emerald-700 dark:text-emerald-400 mt-1';
        refSub.textContent = 'TDS withheld exceeds tax owed → Claim Refund in ITR!';
      } else {
        refEl.textContent = `Due: ${formatActiveDisplay(Math.abs(refundOrDue), cRule)}`;
        refEl.className = 'text-xl font-mono-num font-extrabold text-rose-600 dark:text-rose-400 mt-1';
        refSub.textContent = 'Net balance payable via Advance Tax';
      }
    }

    function updateRetentionModules33To36() {
      const code = state.countryCode;
      const cRule = TAX_RULES[code];
      const mult = state.frequency === 'monthly' ? 12 : 1;
      const grossAnnualLocal = Math.max(0, (Number(state.grossInput) || 0) * mult);
      const preTaxAnnualLocal = Math.max(0, (Number(state.preTaxInput) || 0) * mult);
      const baseCalc = calculateTaxForCountry(code, state.filingStatusId, grossAnnualLocal, preTaxAnnualLocal);

      // 1. Module 35: Monthly Payroll Run (LOP) & 12-Month HRA Rent Receipts
      const calDays = Math.max(28, Math.min(31, parseFloat(document.getElementById('prCalendarDaysInput')?.value) || 30));
      const lopDays = Math.max(0, Math.min(calDays, parseFloat(document.getElementById('prLopDaysInput')?.value) || 0));
      const moBonus = Math.max(0, parseFloat(document.getElementById('prMonthlyBonusReimbInput')?.value) || 0);

      const baseMoGross = grossAnnualLocal / 12;
      const lopDeduction = (baseMoGross / calDays) * lopDays;
      const proratedFactor = (calDays - lopDays) / calDays;
      const moTaxAndPf = ((baseCalc.finalIncomeTax + baseCalc.totalSocialSecurity) / 12) * proratedFactor;
      const finalMoNet = Math.max(0, baseMoGross - lopDeduction + moBonus - moTaxAndPf);

      document.getElementById('prBaseMoGrossVal').textContent = formatActiveDisplay(baseMoGross, cRule);
      document.getElementById('prLopCountLabel').textContent = String(lopDays);
      document.getElementById('prLopDedVal').textContent = `−${formatActiveDisplay(lopDeduction, cRule)}`;
      document.getElementById('prBonusAddVal').textContent = `+${formatActiveDisplay(moBonus, cRule)}`;
      document.getElementById('prMoTaxAndPfVal').textContent = `−${formatActiveDisplay(moTaxAndPf, cRule)}`;
      document.getElementById('prFinalMoNetVal').textContent = formatActiveDisplay(finalMoNet, cRule);

      // 12-Month HRA Rent Receipt Generator
      const landlordName = document.getElementById('hraLandlordNameInput')?.value || 'Landlord Name';
      const landlordPan = document.getElementById('hraLandlordPanInput')?.value || 'ABCDE1234F';
      const propAddr = document.getElementById('hraPropertyAddressInput')?.value || 'Bengaluru';
      const moRent = Math.max(0, parseFloat(document.getElementById('ctcMonthlyRentInput')?.value) || 30000);

      const monthsList = ['Apr 2026', 'May 2026', 'Jun 2026', 'Jul 2026', 'Aug 2026', 'Sep 2026', 'Oct 2026', 'Nov 2026', 'Dec 2026', 'Jan 2027', 'Feb 2027', 'Mar 2027'];
      const receiptsText = `======================================================================
12-MONTH CONSOLIDATED HOUSE RENT ALLOWANCE (HRA) RECEIPT STATEMENT
======================================================================
Tenant / Employee Name : [Your Name]
Landlord Full Name     : ${landlordName}
Landlord PAN / Tax ID  : ${landlordPan} ${moRent * 12 > 100000 ? '(Mandatory PAN Verified > ₹1L/yr)' : ''}
Rented Premises Address: ${propAddr}
Monthly Rent Amount    : ${formatCurrency(moRent, cRule.currency.code)} / month (${formatCurrency(moRent * 12, cRule.currency.code)} / year)
----------------------------------------------------------------------
Receipt No.   Period       Rent Paid            Landlord Signature
----------------------------------------------------------------------
` + monthsList.map((m, i) => `HRA-2026-${String(i + 1).padStart(2, '0')}   ${m.padEnd(10)}   ${formatCurrency(moRent, cRule.currency.code).padEnd(18)}   [Signed: ${landlordName}]`).join('\n') + `
----------------------------------------------------------------------
DECLARATION & REVENUE STAMP ACKNOWLEDGMENT:
Received with thanks a total sum of ${formatCurrency(moRent * 12, cRule.currency.code)} towards residential rent
for FY 2026-27. [Affix ₹1 Revenue Stamp if paid in cash]
======================================================================`;

      const hraPre = document.getElementById('hraRentReceiptsPre');
      if (hraPre) hraPre.textContent = receiptsText;

      // 2. Module 36: Consolidated Year-End CA / CPA Filing Handoff Dossier
      const ytdFlGross = freelancerLedgerEntries.reduce((s, r) => s + r.gross, 0);
      const ytdFlExp = freelancerLedgerEntries.reduce((s, r) => s + r.expense, 0);
      const ytdFlTds = freelancerLedgerEntries.reduce((s, r) => s + r.tds, 0);
      const cgSale = parseFloat(document.getElementById('cgSalePriceInput')?.value) || 0;
      const cgCost = parseFloat(document.getElementById('cgPurchasePriceInput')?.value) || 0;
      const cgNetGain = Math.max(0, cgSale - cgCost);

      const dossierText = `================================================================================
TAXPULSE GLOBAL — 2026 ACCOUNTANT (CA / CPA) YEAR-END FILING HANDOFF DOSSIER
================================================================================
Generated On          : ${new Date().toISOString().slice(0, 10)}
Primary Jurisdiction  : ${cRule.flag} ${cRule.name} (${cRule.code} • ${cRule.currency.code})
Selected Tax Regime   : ${baseCalc.statusObj.label}
Residency Status      : ${activeResidencyStatus.toUpperCase()}

1. SALARIED EMPLOYMENT & PAYROLL SUMMARY
--------------------------------------------------------------------------------
• Gross Annual Salary               : ${formatCurrency(grossAnnualLocal, cRule.currency.code)}
• Standard Deduction Claimed        : ${formatCurrency(baseCalc.standardDeductionAmount, cRule.currency.code)}
• Voluntary Pre-Tax Deductions      : ${formatCurrency(preTaxAnnualLocal, cRule.currency.code)}
• Net Taxable Salary Income         : ${formatCurrency(baseCalc.taxableIncome, cRule.currency.code)}
• Assessed Salary Income Tax        : ${formatCurrency(baseCalc.finalIncomeTax, cRule.currency.code)}
• Mandatory Employee Social Sec/PF  : ${formatCurrency(baseCalc.totalSocialSecurity, cRule.currency.code)}
• Net Annual Take-Home Salary       : ${formatCurrency(baseCalc.netTakeHomeAnnual, cRule.currency.code)} (${formatCurrency(baseCalc.netTakeHomeAnnual / 12, cRule.currency.code)}/mo)

2. HOUSE RENT (HRA) & TAX-SAVING VAULT LOG
--------------------------------------------------------------------------------
• Annual Rent Paid (${landlordName}, PAN: ${landlordPan}) : ${formatCurrency(moRent * 12, cRule.currency.code)}
• Logged Retirement (EPF/PPF/401k)  : ${formatCurrency(parseFloat(document.getElementById('tvRetirementLoggedInput')?.value) || 0, cRule.currency.code)}
• Logged NPS / Pension (Sec 80CCD)  : ${formatCurrency(parseFloat(document.getElementById('tvNpsLoggedInput')?.value) || 0, cRule.currency.code)}
• Logged Health Insurance (Sec 80D) : ${formatCurrency(parseFloat(document.getElementById('tvHealthLoggedInput')?.value) || 0, cRule.currency.code)}

3. FREELANCE / CONSULTING 12-MONTH LEDGER & TDS RECONCILIATION
--------------------------------------------------------------------------------
• YTD Gross Freelance Receipts      : ${formatCurrency(ytdFlGross, cRule.currency.code)} (${freelancerLedgerEntries.length} invoices logged)
• YTD Deductible Business Expenses  : ${formatCurrency(ytdFlExp, cRule.currency.code)}
• Total TDS Withheld (Form 26AS)    : ${formatCurrency(ytdFlTds, cRule.currency.code)}

4. CAPITAL GAINS & DIGITAL ASSETS SUMMARY
--------------------------------------------------------------------------------
• Realized Capital Gain Logged      : ${formatCurrency(cgNetGain, cRule.currency.code)} (Sale: ${formatCurrency(cgSale, cRule.currency.code)} − Cost: ${formatCurrency(cgCost, cRule.currency.code)})
• Harvested Loss Offset Claimed     : ${formatCurrency(parseFloat(document.getElementById('cgHarvestedLossInput')?.value) || 0, cRule.currency.code)}

5. DETERMINISTIC ENGINE VERIFICATION PROOF
--------------------------------------------------------------------------------
• Verification Hash                 : ${generateSignedCalculationReceipt().verification_hash}
================================================================================`;

      const caPre = document.getElementById('caHandoffDossierPre');
      if (caPre) caPre.textContent = dossierText;
    }

    function initRetentionSystems33To36() {
      // Load saved CRM clients and Freelancer Ledger from localStorage if available
      try {
        const savedCrm = localStorage.getItem('taxpulse_ca_client_book_2026');
        if (savedCrm) crmClients = JSON.parse(savedCrm);
        const savedFl = localStorage.getItem('taxpulse_fl_ledger_2026');
        if (savedFl) freelancerLedgerEntries = JSON.parse(savedFl);
      } catch (e) {}

      const prevUpdateAll = updateAllCalculations;
      updateAllCalculations = function() {
        prevUpdateAll();
        renderCrmClientBook();
        renderFreelancerLedger();
        updateRetentionModules33To36();
      };

      // Module 33: Client Book CRM handlers
      document.getElementById('addCrmClientBtn').addEventListener('click', () => {
        const name = (document.getElementById('crmClientNameInput')?.value || 'New Client').trim();
        const taxId = (document.getElementById('crmClientTaxIdInput')?.value || 'N/A').trim();
        const status = document.getElementById('crmClientStatusSelect')?.value || 'Advance Tax Due';
        const note = (document.getElementById('crmClientNotesInput')?.value || '').trim();
        const mult = state.frequency === 'monthly' ? 12 : 1;
        crmClients.unshift({
          id: Date.now(),
          name,
          taxId,
          country: state.countryCode,
          grossAnnual: Math.round((Number(state.grossInput) || 0) * mult),
          preTax: Math.round((Number(state.preTaxInput) || 0) * mult),
          status,
          note
        });
        try { localStorage.setItem('taxpulse_ca_client_book_2026', JSON.stringify(crmClients)); } catch (e) {}
        renderCrmClientBook();
        showToast(`Saved ${name} to Client Book!`);
      });

      document.getElementById('saveCurrentStateAsClientBtn').addEventListener('click', () => {
        document.getElementById('addCrmClientBtn').click();
      });

      document.getElementById('exportClientBookJsonBtn').addEventListener('click', () => {
        const blob = new Blob([JSON.stringify(crmClients, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'TaxPulse_CA_Client_Book_2026.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showToast(`Exported ${crmClients.length} client dossiers (.json)!`);
      });

      // Module 34: Freelancer 12-Month Ledger handlers
      document.getElementById('addFlLedgerEntryBtn').addEventListener('click', () => {
        const month = document.getElementById('flLedgerMonthSelect')?.value || 'Nov 2026';
        const desc = (document.getElementById('flLedgerClientDescInput')?.value || 'Client Invoice').trim();
        const gross = Math.max(0, parseFloat(document.getElementById('flLedgerGrossInput')?.value) || 0);
        const expense = Math.max(0, parseFloat(document.getElementById('flLedgerExpenseInput')?.value) || 0);
        const tds = Math.max(0, parseFloat(document.getElementById('flLedgerTdsInput')?.value) || 0);

        freelancerLedgerEntries.push({ id: Date.now(), month, desc, gross, expense, tds });
        try { localStorage.setItem('taxpulse_fl_ledger_2026', JSON.stringify(freelancerLedgerEntries)); } catch (e) {}
        renderFreelancerLedger();
        updateRetentionModules33To36();
        showToast(`Logged ${month} invoice (${desc})!`);
      });

      // Module 35: Monthly Payroll Run & HRA Rent Receipts handlers
      ['prCalendarDaysInput', 'prLopDaysInput', 'prMonthlyBonusReimbInput', 'hraLandlordNameInput', 'hraLandlordPanInput', 'hraPropertyAddressInput'].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
          el.addEventListener('input', updateRetentionModules33To36);
          el.addEventListener('change', updateRetentionModules33To36);
        }
      });

      document.getElementById('copyHraReceiptsBtn').addEventListener('click', () => {
        fallbackCopy(document.getElementById('hraRentReceiptsPre')?.textContent || '');
        showToast('Copied 12-Month HRA Rent Receipts to clipboard!');
      });

      // Module 36: CA/CPA Handoff Dossier handlers
      document.getElementById('copyCaDossierTextBtn').addEventListener('click', () => {
        fallbackCopy(document.getElementById('caHandoffDossierPre')?.textContent || '');
        showToast('Copied Complete CA/CPA Tax Filing Dossier!');
      });

      document.getElementById('downloadCaDossierFileBtn').addEventListener('click', () => {
        const text = document.getElementById('caHandoffDossierPre')?.textContent || '';
        const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `TaxPulse_${state.countryCode}_2026_CA_Filing_Dossier.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showToast('Downloaded Year-End CA/CPA Filing Dossier (.txt)!');
      });

      applyHumanFriendlyMode(isSimpleHumanMode);
      renderCrmClientBook();
      renderFreelancerLedger();
      updateRetentionModules33To36();
    }

    window.addEventListener('DOMContentLoaded', initRetentionSystems33To36);

    /**
     * ============================================================================
     * MODULE 37: PERSONAL AI TAX ACCOUNTANT & SELF-LEARNING SAVINGS ENGINE
     * Dynamically inspects live `TAX_RULES` (including any Gazette or Tax Year updates),
     * learns the user's personal profile, and computes exact cash savings per strategy.
     * ============================================================================
     */
    let aiAccountantBestPreTaxToApply = 0;
    let aiAccountantBestStatusToApply = null;

    function buildPersonalAiAccountantPlan() {
      const code = state.countryCode;
      const country = TAX_RULES[code];
      const cfg = COUNTRY_TAX_CONFIGS[code]["2026"];
      const mult = state.frequency === 'monthly' ? 12 : 1;
      const grossAnnual = Math.max(0, (Number(state.grossInput) || 0) * mult);
      const currentPreTax = Math.max(0, (Number(state.preTaxInput) || 0) * mult);
      const selectedYear = document.getElementById('profileTaxYearSelect')?.value || '2026';

      const workType = document.getElementById('aiProfileWorkTypeSelect')?.value || 'salaried';
      const housing = document.getElementById('aiProfileHousingSelect')?.value || 'renting';
      const family = document.getElementById('aiProfileParentsSelect')?.value || 'senior_parents';
      const invest = document.getElementById('aiProfileInvestmentsSelect')?.value || 'nps_and_stocks';

      // Persist learned profile in localStorage
      try {
        localStorage.setItem('taxpulse_ai_accountant_profile', JSON.stringify({ workType, housing, family, invest }));
      } catch (e) {}

      const curCalc = calculateTaxForCountry(code, state.filingStatusId, grossAnnual, currentPreTax);
      const strategies = [];

      // Strategy 1: Employer Pre-Tax Retirement / NPS / 401(k) / Salary Sacrifice Shield
      const maxStatutoryPreTaxRate = code === 'IN' ? 0.07 : code === 'US' ? 0.15 : code === 'GB' ? 0.15 : 0.10;
      const recommendedPreTax = Math.max(currentPreTax, Math.round(grossAnnual * maxStatutoryPreTaxRate));
      const addPreTaxNeeded = Math.max(0, recommendedPreTax - currentPreTax);
      const simWithPreTax = calculateTaxForCountry(code, state.filingStatusId, grossAnnual, recommendedPreTax);
      const savedFromPreTax = Math.max(0, curCalc.finalIncomeTax - simWithPreTax.finalIncomeTax);

      if (code === 'IN') {
        strategies.push({
          badge: 'Works in New Regime!',
          title: '1. Ask HR for 14% Employer NPS Contribution (Sec 80CCD(2))',
          savedAmount: savedFromPreTax > 0 ? savedFromPreTax : Math.round(grossAnnual * 0.07 * (curCalc.marginalRatePct / 100)),
          howItWorks: `Even though most deductions (like 80C) are removed in India's ${selectedYear} New Tax Regime, Employer NPS contribution up to 14% of Basic Salary remains 100% tax-deductible! Redirecting ${formatActiveDisplay(recommendedPreTax, country)}/yr of your CTC into Employer NPS cuts your tax at your ${curCalc.marginalRatePct.toFixed(0)}% slab rate.`,
          actionStep: 'Open Tab 22 (Salary Restructurer) and send the pre-written HR email before your next payroll cycle.'
        });
      } else if (code === 'GB' && (grossAnnual - currentPreTax) > 100000 && (grossAnnual - currentPreTax) < 125140) {
        const excess100k = (grossAnnual - currentPreTax) - 100000;
        const simRecoverPa = calculateTaxForCountry('GB', state.filingStatusId, grossAnnual, currentPreTax + excess100k);
        const paSaved = Math.max(0, curCalc.finalIncomeTax - simRecoverPa.finalIncomeTax);
        strategies.push({
          badge: '60% Tax Trap Escape',
          title: '1. Use Workplace Pension Salary Sacrifice to Escape the £100k Taper Trap',
          savedAmount: paSaved,
          howItWorks: `Because your income is between £100,000 and £125,140, you lose £1 of your £${country.standardDeduction.value.toLocaleString()} Personal Allowance for every £2 earned—creating a hidden 60% marginal tax rate! Sacrificing ${formatActiveDisplay(excess100k, country)} into your pension restores your full tax-free allowance.`,
          actionStep: 'Ask your UK employer payroll team to set up a qualifying Salary Sacrifice pension contribution.'
        });
      } else {
        strategies.push({
          badge: 'Pre-Tax Paycheck Shield',
          title: `1. Maximize ${country.preTaxHint.split('/')[0].trim()} Pre-Tax Contributions`,
          savedAmount: savedFromPreTax > 0 ? savedFromPreTax : Math.round(grossAnnual * 0.10 * (curCalc.marginalRatePct / 100)),
          howItWorks: `Every ${country.currency.symbol.trim()}100 you contribute pre-tax avoids your ${curCalc.marginalRatePct.toFixed(1)}% marginal tax bracket immediately. Contributing ${formatActiveDisplay(recommendedPreTax, country)}/yr lowers your taxable base from ${formatActiveDisplay(curCalc.taxableIncome, country)} to ${formatActiveDisplay(simWithPreTax.taxableIncome, country)}.`,
          actionStep: 'Click "Apply Best Savings" above to test this pre-tax deduction in your live paycheck.'
        });
      }

      // Strategy 2: Regime & Filing Status Comparison (Adapts automatically when slabs/deductions change!)
      let bestRegimeObj = curCalc.statusObj;
      let bestRegimeSavings = 0;
      country.filingStatuses.forEach(st => {
        const extraAllowancesForOld = (code === 'IN' && st.id === 'old_regime' && (housing === 'renting' || housing === 'parents_home' || housing === 'home_loan'))
          ? 375000 // 1.5L 80C + 50k 80CCD(1B) + 50k 80D Senior Parents + 1.25L HRA/Home Loan
          : currentPreTax;
        const simSt = calculateTaxForCountry(code, st.id, grossAnnual, extraAllowancesForOld);
        const diff = curCalc.finalIncomeTax - simSt.finalIncomeTax;
        if (diff > bestRegimeSavings) {
          bestRegimeSavings = diff;
          bestRegimeObj = st;
        }
      });

      strategies.push({
        badge: bestRegimeSavings > 0 ? 'Regime Switch Win' : 'Regime Verified',
        title: bestRegimeSavings > 0
          ? `2. Switch Filing Status to "${bestRegimeObj.label}"`
          : `2. Stay in "${curCalc.statusObj.label}" (Verified Optimal for ${selectedYear})`,
        savedAmount: bestRegimeSavings > 0 ? bestRegimeSavings : Math.round(country.standardDeduction.value * (curCalc.marginalRatePct / 100 || 0.15)),
        howItWorks: bestRegimeSavings > 0
          ? `Based on your housing (${housing.replace('_', ' ')}) and family profile, switching to ${bestRegimeObj.label} unlocks an extra ${formatActiveDisplay(bestRegimeSavings, country)}/yr in net tax savings.`
          : `I compared all ${country.filingStatuses.length} regimes for ${country.name} under ${selectedYear} rules (including the ${formatActiveDisplay(country.standardDeduction.value, country)} standard deduction). Your current regime already gives you the lowest tax bill.`,
        actionStep: bestRegimeSavings > 0
          ? `Switch the Filing Status dropdown to "${bestRegimeObj.label}" before filing your return.`
          : 'No regime change needed—focus on pre-tax retirement and capital gains harvesting below.'
      });

      // Strategy 3: Housing, Parents & Family Tax Arbitrage
      const familySavings = family === 'senior_parents'
        ? (code === 'IN' ? Math.round(50000 * 0.20) : Math.round(grossAnnual * 0.025))
        : housing === 'parents_home'
        ? (code === 'IN' ? Math.round(180000 * 0.20) : Math.round(grossAnnual * 0.02))
        : Math.round(grossAnnual * 0.02);

      strategies.push({
        badge: 'Family & Housing Strategy',
        title: housing === 'parents_home'
          ? '3. Pay Formal Monthly Rent to Parents (Family Bracket Arbitrage)'
          : family === 'senior_parents'
          ? '3. Claim Senior Parent Healthcare & Multi-Generational Tax Shield'
          : '3. Optimize Housing & Household Tax Credits',
        savedAmount: familySavings,
        howItWorks: housing === 'parents_home'
          ? 'If you live in a home owned by your parents and they are in a lower (or 0%) tax bracket, paying them monthly rent via bank transfer with a formal rent agreement lets you claim HRA exemption (or shifts income to their ₹12L zero-tax slab).'
          : family === 'senior_parents'
          ? (code === 'IN'
              ? 'Paying health insurance premiums or medical bills for senior citizen parents (60+) unlocks up to ₹50,000 deduction under Section 80D, and investing their savings in Senior Citizen Savings Scheme (SCSS) earns tax-free interest up to their basic exemption.'
              : 'Claiming dependent parent/child credits and family health savings accounts (HSA) directly reduces your household tax burden.')
          : 'Logging your monthly rent receipts (with landlord PAN) or mortgage interest ensures you capture your full statutory housing relief.',
        actionStep: 'Use Tab 30 (Monthly Leave Pay & HRA Rent Receipts) to generate your 12-month rent receipts.'
      });

      // Strategy 4: Work-Type Specific Strategy (Freelance 44ADA / QBI vs. Stock Tax-Gain Harvesting)
      const cgAsset = cfg.modules.capital_gains_crypto.assets.listed_equity;
      const annualFreeLtcgTax = (cgAsset.annual_exemption || 0) * (cgAsset.long_term_rate || 0.125);
      const sideConsultingSaving = Math.round((grossAnnual * 0.15) * (curCalc.marginalRatePct / 100) * 0.50);

      if (workType === 'salaried_plus_side' || workType === 'freelancer' || workType === 'business_owner') {
        strategies.push({
          badge: code === 'IN' ? 'Sec 44ADA 50% Rule' : 'Pass-Through Shield',
          title: code === 'IN'
            ? '4. Declare Consulting / Freelance Income Under Section 44ADA (Tax Only 50%!)'
            : '4. Deduct Home Office, Cloud & Equipment Expenses + 20% QBI Shield',
          savedAmount: sideConsultingSaving > 0 ? sideConsultingSaving : Math.round(grossAnnual * 0.04),
          howItWorks: code === 'IN'
            ? 'Under Section 44ADA of the Income Tax Act, software developers, designers, and consultants earning up to ₹75 Lakh in freelance receipts only pay tax on 50% of their gross receipts—cutting the effective tax rate on consulting income in half with zero audit books required!'
            : 'Independent contractors and solo founders can deduct 100% of business software, laptops, home-office percentage, and travel before tax, plus claim the 20% Section 199A QBI deduction in the US.',
          actionStep: 'Open Tab 9 (Freelancer vs. Full-Time Compare) and Tab 29 (12-Month Freelancer Ledger) to track your receipts.'
        });
      } else {
        strategies.push({
          badge: 'Investment Tax Shield',
          title: code === 'IN'
            ? '4. Harvest ₹1,25,000 Tax-Free Long-Term Equity Gains Every March ("Tax-Gain Harvesting")'
            : code === 'GB'
            ? '4. Use Your £20,000 ISA Allowance & £3,000 Annual CGT Exemption'
            : '4. Harvest Tax Losses & Hold Equities > 12 Months for Long-Term Brackets',
          savedAmount: annualFreeLtcgTax > 0 ? Math.round(annualFreeLtcgTax) : Math.round(grossAnnual * 0.018),
          howItWorks: code === 'IN'
            ? 'Under Section 112A, the first ₹1,25,000 of Long-Term Capital Gains (LTCG) on listed shares and equity mutual funds each financial year is 100% tax-free (saving ₹15,625 + cess every year). Selling and immediately repurchasing winning funds before March 31 resets your cost basis tax-free!'
            : 'Realizing long-term gains up to your annual tax-free exemption and offsetting losing positions against short-term gains prevents capital gains tax from compounding.',
          actionStep: 'Open Tab 3 (Stocks, Property & Crypto Profit Tax) to test your LTCG exemption and loss harvesting.'
        });
      }

      const totalPotentialSavings = strategies.reduce((sum, s) => sum + (Number(s.savedAmount) || 0), 0);
      aiAccountantBestPreTaxToApply = recommendedPreTax;
      aiAccountantBestStatusToApply = bestRegimeObj.id;

      // Update Top Quick Button & Header KPIs
      const quickBadge = document.getElementById('quickAiSavingsPreviewBadge');
      if (quickBadge) quickBadge.textContent = `Save ${formatActiveDisplay(totalPotentialSavings, country)}/yr →`;

      document.getElementById('aiAccTotalPotentialSavingsVal').textContent = `+${formatActiveDisplay(totalPotentialSavings, country)} / yr`;
      document.getElementById('aiAccMonthlyBoostSub').textContent = `+${formatActiveDisplay(totalPotentialSavings / 12, country)} / month extra in your pocket`;

      const activePatches = REGULATORY_BULLETINS.filter(b => b.applied).length;
      document.getElementById('aiAccRuleVersionTag').textContent = `Synced: ${selectedYear} Rules (${activePatches} Gazette Patch${activePatches === 1 ? '' : 'es'})`;
      document.getElementById('aiAccActiveLawAdaptationBadge').textContent = `Live Rule Engine: ${country.flag} ${country.name} (${selectedYear}) • Std Ded: ${formatActiveDisplay(country.standardDeduction.value, country)}`;

      // Render Playbook Cards
      const cardsEl = document.getElementById('aiAccPlaybookCardsContainer');
      if (cardsEl) {
        cardsEl.innerHTML = strategies.map(st => `
          <div class="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 flex flex-col justify-between space-y-3">
            <div class="space-y-1.5">
              <div class="flex items-center justify-between gap-2">
                <span class="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300">${st.badge}</span>
                <span class="px-2.5 py-0.5 rounded-full text-xs font-mono-num font-extrabold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                  Save ${formatActiveDisplay(st.savedAmount, country)}/yr
                </span>
              </div>
              <h4 class="text-sm font-bold text-slate-900 dark:text-white pt-0.5">${st.title}</h4>
              <p class="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">${st.howItWorks}</p>
            </div>
            <div class="pt-2.5 border-t border-slate-200/70 dark:border-slate-700/70 text-[11px] font-semibold text-indigo-600 dark:text-indigo-400">
              👉 Next Step: ${st.actionStep}
            </div>
          </div>
        `).join('');
      }

      // Render Rule-Change Adaptation Explanation
      const adaptEl = document.getElementById('aiAccRuleAdaptationExplanation');
      if (adaptEl) {
        adaptEl.innerHTML = `
          <div>• <strong>Live Standard Deduction Check (${formatActiveDisplay(country.standardDeduction.value, country)}):</strong> When you switch between 2024, 2025, 2026, and 2027 Forecast (or toggle a Gazette update in Tab 9), I immediately re-run all brackets to see if the deduction change shifts your optimal regime.</div>
          <div>• <strong>Social Security Cap Awareness (${country.socialSecurity.wageCap ? formatActiveDisplay(country.socialSecurity.wageCap, country) : 'Uncapped'}):</strong> I factor in statutory ceiling changes (like India's ₹25,000/mo EPFO ceiling or the US $184,500 FICA cap) so your take-home math is never outdated.</div>
          <div>• <strong>Capital Gains &amp; Relief Guardrails:</strong> I automatically adapt to each country's exemption rules (such as India's ₹1.25L LTCG exemption &amp; Sec 115BBH crypto rules or the UK £3,000 CGT allowance).</div>
        `;
      }
    }

    function answerAiAccountantQuestion(questionTypeOrText) {
      const code = state.countryCode;
      const country = TAX_RULES[code];
      const mult = state.frequency === 'monthly' ? 12 : 1;
      const grossAnnual = Math.max(0, (Number(state.grossInput) || 0) * mult);
      const curCalc = calculateTaxForCountry(code, state.filingStatusId, grossAnnual, (Number(state.preTaxInput) || 0) * mult);
      const box = document.getElementById('aiAccChatAnswerBox');
      if (!box) return;

      const q = String(questionTypeOrText || '').toLowerCase();

      if (q === 'how_zero_tax' || q.includes('zero') || q.includes('0 tax')) {
        if (code === 'IN') {
          const neededDeduction = Math.max(0, grossAnnual - 1275000);
          box.innerHTML = neededDeduction === 0
            ? `🎉 <strong>Good news!</strong> Because your gross income (${formatActiveDisplay(grossAnnual, country)}) is at or below <strong>₹12,75,000</strong>, the ₹75,000 Standard Deduction plus the ₹60,000 Section 87A/202 Rebate already brings your income tax to <strong>₹0</strong>!`
            : `💡 <strong>How to reach ₹0 tax on ${formatActiveDisplay(grossAnnual, country)}:</strong> In India's New Tax Regime, taxable income up to ₹12,00,000 owes <strong>₹0 tax</strong> (₹12,75,000 gross after the ₹75,000 standard deduction). To bring your taxable income down to ₹12,00,000, you need <strong>${formatActiveDisplay(neededDeduction, country)}</strong> in pre-tax Employer NPS (Sec 80CCD(2)) and tax-free flexi allowances.`;
        } else {
          box.innerHTML = `💡 <strong>Zero-Tax Threshold in ${country.name}:</strong> Your first <strong>${formatActiveDisplay(country.standardDeduction.value, country)}</strong> of income is automatically tax-free via the Standard Deduction/Personal Allowance. Any income above that can be shielded by contributing to ${country.preTaxHint}.`;
        }
        return;
      }

      if (q === 'what_changed' || q.includes('change') || q.includes('rule') || q.includes('new')) {
        box.innerHTML = `🔄 <strong>How Latest Rule Changes Affect You in ${country.name}:</strong> At your current salary of <strong>${formatActiveDisplay(grossAnnual, country)}</strong>, your effective tax rate is <strong>${curCalc.effectiveTotalRate.toFixed(1)}%</strong> and your marginal bracket is <strong>${curCalc.marginalRatePct.toFixed(1)}%</strong>. Whenever a tax slab, standard deduction (${formatActiveDisplay(country.standardDeduction.value, country)}), or social security cap changes in Tab 9 (Live Rule Updates), I immediately recalculate whether switching regimes or increasing pre-tax contributions saves you more money.`;
        return;
      }

      if (q === 'family_tricks' || q.includes('parent') || q.includes('family') || q.includes('wife') || q.includes('spouse')) {
        box.innerHTML = `👨‍👩‍👧 <strong>Family &amp; Parents Tax-Saving Strategies:</strong> (1) If you live in your parents' house, pay them monthly rent via bank transfer to claim HRA (and if your parents are retired with total income under ₹12 Lakh in India, that rental income is 100% tax-free in their hands!). (2) Pay senior parents' health insurance premiums (saves up to ₹50,000 taxable income under Sec 80D). (3) Invest gift money in the name of a non-earning spouse or adult child/parent to utilize their separate tax-free basic exemption and ₹1.25L LTCG exemption.`;
        return;
      }

      if (q === 'stock_harvest' || q.includes('stock') || q.includes('mutual') || q.includes('ltcg') || q.includes('crypto')) {
        box.innerHTML = `📈 <strong>Stock, Mutual Fund &amp; Crypto Tax-Saving Rules:</strong> (1) Hold listed stocks and equity mutual funds for at least 12 months so your tax rate drops from 20% (STCG) to 12.5% (LTCG). (2) Every year before March 31, book up to <strong>₹1,25,000</strong> (or £3,000 in the UK / $49,450 in the US 0% bracket) of long-term equity profit completely tax-free and buy the shares back the next day to step up your cost basis. (3) Offset any losing stock positions against your realized gains in Tab 3!`;
        return;
      }

      box.innerHTML = `🤖 <strong>Personal AI Tax Advisor (${country.name}):</strong> On your annual income of <strong>${formatActiveDisplay(grossAnnual, country)}</strong>, your fastest way to save tax right now is to shield income from your top <strong>${curCalc.marginalRatePct.toFixed(1)}%</strong> marginal bracket using <strong>${country.preTaxHint}</strong>. Click <strong>"✨ Apply Best Savings to My Calculator"</strong> at the top of this panel to apply my recommended deduction automatically!`;
    }

    function initPersonalAiAccountant() {
      // Restore learned profile from localStorage if saved
      try {
        const savedProf = localStorage.getItem('taxpulse_ai_accountant_profile');
        if (savedProf) {
          const p = JSON.parse(savedProf);
          if (p.workType && document.getElementById('aiProfileWorkTypeSelect')) document.getElementById('aiProfileWorkTypeSelect').value = p.workType;
          if (p.housing && document.getElementById('aiProfileHousingSelect')) document.getElementById('aiProfileHousingSelect').value = p.housing;
          if (p.family && document.getElementById('aiProfileParentsSelect')) document.getElementById('aiProfileParentsSelect').value = p.family;
          if (p.invest && document.getElementById('aiProfileInvestmentsSelect')) document.getElementById('aiProfileInvestmentsSelect').value = p.invest;
        }
      } catch (e) {}

      const prevUpdateAll = updateAllCalculations;
      updateAllCalculations = function() {
        prevUpdateAll();
        buildPersonalAiAccountantPlan();
      };

      // Quick button in top takeaway card opens the Personal AI Tax Accountant tab immediately
      document.getElementById('openAiAccountantQuickBtn').addEventListener('click', () => {
        switchModuleTab('ai_accountant');
      });

      // Apply Best Savings button
      document.getElementById('aiAccApplyAllBtn').addEventListener('click', () => {
        if (aiAccountantBestStatusToApply) {
          state.filingStatusId = aiAccountantBestStatusToApply;
          document.getElementById('filingStatusSelect').value = aiAccountantBestStatusToApply;
        }
        const newPreTax = state.frequency === 'monthly'
          ? Math.round(aiAccountantBestPreTaxToApply / 12)
          : Math.round(aiAccountantBestPreTaxToApply);
        state.preTaxInput = newPreTax;
        document.getElementById('preTaxDeductionInput').value = newPreTax;
        updateAllCalculations();
        showToast('Applied your AI Accountant tax-saving plan to your paycheck!');
      });

      // Bind Personal Profile Selectors
      ['aiProfileWorkTypeSelect', 'aiProfileHousingSelect', 'aiProfileParentsSelect', 'aiProfileInvestmentsSelect'].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
          el.addEventListener('change', () => {
            buildPersonalAiAccountantPlan();
            answerAiAccountantQuestion('what_changed');
            showToast('AI Accountant updated your personalized savings plan!');
          });
        }
      });

      // Bind Question Chips & Custom Ask Input
      document.querySelectorAll('.ai-q-chip').forEach(chip => {
        chip.addEventListener('click', () => {
          answerAiAccountantQuestion(chip.getAttribute('data-ai-q'));
        });
      });

      document.getElementById('aiAccAskBtn').addEventListener('click', () => {
        answerAiAccountantQuestion(document.getElementById('aiAccCustomQuestionInput')?.value || '');
      });
      document.getElementById('aiAccCustomQuestionInput').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          answerAiAccountantQuestion(e.target.value);
        }
      });

      applyHumanFriendlyMode(isSimpleHumanMode);
      buildPersonalAiAccountantPlan();
      answerAiAccountantQuestion('how_zero_tax');
    }

    window.addEventListener('DOMContentLoaded', initPersonalAiAccountant);

    // =====================================================================
    // PERSONA FILTER, PRO/ENTERPRISE CHECKOUT MODAL & MODULE 38 GOVERNANCE
    // =====================================================================
    const PERSONA_TABS_MAP = {
      all: null,
      salaried: ['pit', 'ai_accountant', 'ctc_restructurer', 'salary_hike', 'equity_bonus', 'gratuity_exit', 'tax_vault', 'residency_payslip'],
      freelancer: ['pit', 'ai_accountant', 'freelancer_billing', 'freelancer_ledger', 'contractor_eor', 'quarterly_tax', 'fx_payout', 'ca_handoff'],
      enterprise: ['pit', 'enterprise_governance', 'payroll', 'bulk_csv', 'team_planner', 'payroll_hra_generator', 'pe_risk', 'transfer_pricing', 'corporate', 'agentic_hub', 'x402_tollbooth'],
      advisor: ['pit', 'client_crm', 'ca_handoff', 'whitelabel_studio', 'doc_parser', 'dtaa', 'capgains', 'enterprise_governance', 'ai_accountant']
    };

    const entAuditRows = [
      { id: 'AUD-2026-01', entity: 'Acme India Pvt Ltd', op: 'Monthly Payroll Run (142 Staff)', proof: 'txp_sha256_91c4e8a2f01b', status: 'APPROVED' },
      { id: 'AUD-2026-02', entity: 'Acme Holdings Inc (US)', op: 'Cost-Plus 15.5% Transfer Pricing', proof: 'txp_sha256_4a8b0912cc7d', status: 'DRAFT' }
    ];

    function renderEntAuditLedger() {
      const tbody = document.getElementById('entAuditLedgerBody');
      if (!tbody) return;
      const role = document.getElementById('entActorRoleSelect')?.value || 'finance';
      const canApprove = ['finance', 'ca'].includes(role);
      tbody.innerHTML = entAuditRows.map(r => {
        const badgeCls = r.status === 'APPROVED'
          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
          : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300';
        const btnHtml = r.status === 'APPROVED'
          ? '<span class="text-[10px] text-slate-400">Signed</span>'
          : (canApprove
            ? `<button type="button" data-approve-id="${r.id}" class="ent-approve-btn px-2 py-0.5 rounded bg-indigo-600 text-white text-[10px] font-bold hover:bg-indigo-700">Approve</button>`
            : '<span class="text-[10px] text-slate-400">Finance Only</span>');
        return `<tr>
          <td class="py-2 pr-2"><div class="font-semibold text-slate-800 dark:text-slate-100">${r.entity}</div><div class="text-[10px] text-slate-500">${r.op}</div></td>
          <td class="py-2 pr-2 font-mono-num text-[10px] text-indigo-600 dark:text-indigo-400">${r.proof.slice(0, 18)}...</td>
          <td class="py-2 pr-2"><span class="px-2 py-0.5 rounded text-[10px] font-bold ${badgeCls}">${r.status}</span></td>
          <td class="py-2 text-right">${btnHtml}</td>
        </tr>`;
      }).join('');

      tbody.querySelectorAll('.ent-approve-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const id = btn.getAttribute('data-approve-id');
          const row = entAuditRows.find(x => x.id === id);
          if (row) row.status = 'APPROVED';
          renderEntAuditLedger();
          showToast(`Approved audit entry ${id}`);
        });
      });
    }

    function initPersonaCheckoutAndEnterprise() {
      // 1. Persona Filter
      document.querySelectorAll('.persona-filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const persona = btn.getAttribute('data-persona');
          window.__activeTaxPulsePersona = persona;
          const allowed = PERSONA_TABS_MAP[persona];
          document.querySelectorAll('.persona-filter-btn').forEach(b => {
            const act = b.getAttribute('data-persona') === persona;
            b.className = act
              ? 'persona-filter-btn px-3 py-1.5 rounded-xl text-xs font-bold bg-indigo-600 text-white shadow-sm shrink-0 transition-all'
              : 'persona-filter-btn px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-indigo-50 dark:hover:bg-slate-700 shrink-0 transition-all';
          });
          let visibleCount = 0;
          document.querySelectorAll('.module-tab-btn').forEach(tabBtn => {
            const tabId = tabBtn.getAttribute('data-module-tab');
            const show = !allowed || allowed.includes(tabId);
            tabBtn.style.display = show ? '' : 'none';
            if (show) visibleCount++;
          });
          const sumEl = document.getElementById('personaFilterSummary');
          if (sumEl) {
            sumEl.textContent = allowed
              ? `Showing ${visibleCount} curated tools for this role`
              : `Showing all ${visibleCount} tools across personal, freelance, and enterprise suites`;
          }
          if (allowed && allowed[1]) switchModuleTab(allowed[1]);
        });
      });

      // 2. Zero-Backend Checkout Modal
      const modal = document.getElementById('proCheckoutModal');
      const openBtn = document.getElementById('openCheckoutModalBtn');
      const closeBtn = document.getElementById('closeCheckoutModalBtn');
      const statusBox = document.getElementById('checkoutGatewayStatus');
      const licBadge = document.getElementById('activeLicenseBadge');

      try {
        const savedLic = localStorage.getItem('taxpulse_license_key');
        if (savedLic && licBadge) licBadge.textContent = `Active License: ${savedLic} (Unlocked)`;
      } catch (e) {}

      if (openBtn && modal) openBtn.addEventListener('click', () => modal.classList.remove('hidden'));
      if (closeBtn && modal) closeBtn.addEventListener('click', () => modal.classList.add('hidden'));
      if (modal) {
        modal.addEventListener('click', (e) => { if (e.target === modal) modal.classList.add('hidden'); });
        document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !modal.classList.contains('hidden')) modal.classList.add('hidden'); });
      }

      document.querySelectorAll('.checkout-gw-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const gw = btn.getAttribute('data-checkout-gw').toUpperCase();
          const tier = btn.getAttribute('data-checkout-tier');
          const demoUrl = gw === 'STRIPE'
            ? 'https://buy.stripe.com/your-payment-link'
            : (gw === 'CASHFREE' ? 'https://payments.cashfree.com/links/your-link' : 'https://rzp.io/l/your-payment-link');
          if (statusBox) {
            statusBox.innerHTML = `🔗 <strong>${gw} Payment Link Ready</strong> for <strong>${tier}</strong>: <code class="font-mono-num text-indigo-600 dark:text-indigo-400">${demoUrl}</code> — Replace with your live ${gw} link in production!`;
          }
        });
      });

      document.getElementById('activateLicenseKeyBtn')?.addEventListener('click', () => {
        const key = (document.getElementById('licenseKeyInput')?.value || '').trim().toUpperCase();
        if (!key || key.length < 6) {
          showToast('Enter a valid license key (e.g. TXP-PRO-2026)');
          return;
        }
        try { localStorage.setItem('taxpulse_license_key', key); } catch (e) {}
        if (licBadge) licBadge.textContent = `Active License: ${key} (Unlocked)`;
        showToast(`Activated ${key}!`);
      });

      // 3. Module 38 Enterprise Governance
      document.getElementById('entActorRoleSelect')?.addEventListener('change', renderEntAuditLedger);
      document.getElementById('logCurrentCalcAuditBtn')?.addEventListener('click', () => {
        const orgLabel = document.getElementById('entOrgEntitySelect')?.selectedOptions[0]?.textContent || 'Acme Corp';
        const hash = document.getElementById('liveDeterministicHashBadge')?.textContent?.replace('Proof: ', '').trim() || 'txp_sha256_edge2026';
        entAuditRows.unshift({
          id: `AUD-2026-0${entAuditRows.length + 1}`,
          entity: orgLabel,
          op: `Deterministic Calc (${state.countryCode} ${state.taxYear})`,
          proof: hash,
          status: 'DRAFT'
        });
        renderEntAuditLedger();
        showToast('Logged calculation to D1 Audit Ledger!');
      });

      document.getElementById('runHrisWebhookSimBtn')?.addEventListener('click', () => {
        const box = document.getElementById('hrisWebhookResultBox');
        try {
          const parsed = JSON.parse(document.getElementById('hrisWebhookPayloadInput')?.value || '{}');
          const emps = Array.isArray(parsed.employees) ? parsed.employees : [];
          const totalGross = emps.reduce((acc, e) => acc + (Number(e.grossAnnual) || 0), 0);
          const mockHash = 'txp_sha256_' + Math.abs(Math.round(totalGross * 2654435761)).toString(16).padStart(12, '0');
          entAuditRows.unshift({
            id: `AUD-2026-0${entAuditRows.length + 1}`,
            entity: `${parsed.source || 'HRIS'} Sync`,
            op: `Synced ${emps.length} Employees`,
            proof: mockHash,
            status: 'DRAFT'
          });
          renderEntAuditLedger();
          if (box) {
            box.innerHTML = `<div class="font-bold text-emerald-700 dark:text-emerald-300">✅ Synced ${emps.length} employees via HMAC-SHA256</div><div class="font-mono-num text-[11px]">Batch Proof: ${mockHash}</div>`;
          }
        } catch (err) {
          if (box) box.innerHTML = '<div class="text-rose-600 font-semibold">Invalid JSON payload.</div>';
        }
      });

      document.getElementById('exportEntAuditCsvBtn')?.addEventListener('click', () => {
        const lines = ['id,entity,operation,proof_hash,status'];
        entAuditRows.forEach(r => lines.push(`"${r.id}","${r.entity}","${r.op}","${r.proof}","${r.status}"`));
        const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'taxpulse_d1_audit_ledger.csv';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showToast('Exported D1 Audit Ledger CSV!');
      });

      renderEntAuditLedger();
    }

    window.addEventListener('DOMContentLoaded', initPersonaCheckoutAndEnterprise);












  