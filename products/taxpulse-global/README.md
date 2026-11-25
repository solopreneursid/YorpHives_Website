# TaxPulse Global — HQventures

Development only. Original prototype: reference/original-prototype.html.txt. Do not serve this reference publicly as executable HTML.

Keep the original 38 modules and eight jurisdictions as development references; replace or retire outdated implementations when a safer, simpler alternative exists. Tax laws must be verified against official sources before activation. No simulated payment, SSO, document processing or cryptographic verification may be advertised as operational.

## Release gates
- Complete original engine migration and verify source provenance.
- Verify each country/year/module rule against authoritative sources and independent expected results.
- Test UI/API/MCP parity, input validation, privacy, access controls, payment verification, rollback and browser accessibility.
- Keep staging separate from production. No production routes or automatic production deployment until gates pass.
- HQ monitoring remains read-only.

Existing hosted previews are experimental and not suitable for financial decisions.

## Current isolated development status (2026-11-25)

- The original 38-module frontend remains in source control for migration and regression testing; it is no longer served by the new integrated preview build. Production is not enabled.
- Seven sample country/API calculation modules are available for IN, US, and GB only. The other five country fixtures remain excluded from the API as unverified.
- Independent US federal single-filer and UK England/Wales/NI ordinary-income vectors live in `tests/official-pit-vectors.test.mjs`. Scope and official references are recorded in `rules/evidence/pit-independent-vectors-2026-11-25.json`. Passing them does not certify either country or any whole module.
- The production release gate now requires actual backend country support and official-source evidence for every required module, not merely verified flags.
- Local-only encrypted record storage is implemented in `engine/browser-vault.mjs`, backed by `engine/secure-records.mjs`, and retained as development-only code; not served by the simple workspace. It is not yet wired into the user-facing save/open workflow.
- The simulated Pro checkout trigger is disabled in the isolated prototype frontend.
- The staging workflow runs `node --test products/taxpulse-global/tests/*.test.mjs` on branch updates.

## Local encrypted record contract

Use `openEncryptedVault()` in a supported secure browser to open a device-local IndexedDB vault, then `save(record, passphrase)`, `list()`, `read(id, passphrase)`, `remove(id)` and `close()`. Only AES-256-GCM encrypted envelopes and opaque record identifiers are stored; the passphrase is neither stored nor uploaded. Record limits, browser eviction, private browsing, lost passwords, accessibility and real-browser testing remain deployment considerations. This module is not an account-sync service or a recovery system.

## Remaining hard blockers

Full official tax-rule review for all eight jurisdictions and required modules; independent browser/end-to-end tests; authentication and access-control review; secure record UI and backup/recovery experience; privacy and financial-data handling review; reliable document ingestion; honest AI and payment integration; final release/rollback testing. Maintain noindex and preview-only disclaimers until these gates are cleared.

## Narrow income-tax correctness improvements

- The 2026 US personal income sample accepts `parameters.filingStatus`: `single` (default), `mfj`, `hoh`, or `mfs`. Official IRS bracket thresholds were copied into `engine/us-filing-statuses.mjs`; the original US single filing status remains the default. The 2026 head-of-household threshold at $201,750 was corrected in the frontend. These results remain illustrative and exclude credits, itemization, AMT, and state/local taxes.
- India `pit` now **requires** `parameters.residentIndividual` to be explicitly `true` or `false`. Only `true` applies the prototype Section 87A/202 rebate and marginal relief; ordinary salary income is assumed. The 2026 Income Tax Department FAQ test examples are recorded in `rules/evidence/india-2026-rebate-marginal-relief-review.json` and tested in `tests/pit-audit.test.mjs`. Full FY 2026–27 legislative coverage is not certified.
- `pit` API responses now expose pre-tax deductions, standard allowance, progressive tax before rebate, rebate amount, marginal relief, cess, effective income-tax rate, a tax-year label, and band-by-band calculations so reviewers can reconcile the arithmetic.
- The original frontend's India demo still assumes residence for its new-regime example. The explicit API residency contract does not imply a verified customer identity or residency determination.


## User-first product direction (2026-11-25)

The founder authorized redesign, replacement, addition and removal of legacy prototype features. The simple workspace is now the integrated Worker's root, with five user-facing sections: My Tax, Compare, Plan, Business and Updates. Only working sample features are interactive. The old frontend remains in source, but is not published by this build. Its CDN runtime and speculative financial integrations are not exposed on the new workspace. Previously deployed prototype Workers are unaffected by these source changes.

The simple browser uses the exact same country engine as the API, with local ES modules and a strict same-origin content security policy. Income inputs stay in memory; there is no login, network submission, third-party analytics or persistent financial storage. The three connected countries (India, United States, UK excluding Scotland) are fictional examples only. Other countries are explicitly unavailable. The same-country salary comparison holds deductions and tax status constant, labels income remaining after income tax rather than take-home pay, and highlights a negative change in after-tax income.

### Roadmap and acceptance boundaries
1. P0: Verify country/year/module tax rules against official statutes and independent expected outputs, consolidate browser/API logic, establish transparent rule provenance and replayable calculations. Do not launch unverified rules.
2. P0: Mobile-first guided workflow, plain-language results, accessible controls, no account for basic calculations; privacy and security review; real-browser tests. Preserve original code only as reference where necessary.
3. P1: Decision Engine, What-If Simulator, Tax Opportunity Finder, Tax Cliff Detector, TaxPulse Proof and Trust Centre. Each recommendation must have explicit eligibility, calculation scope and source evidence. Hashes alone do not certify legal correctness.
4. P1: Historical years, relocation comparisons, tax residency screening, Financial Twin with encrypted local storage and recovery, locally processed documents, personalized regulatory change impact. Separate proposals from enacted laws; no automatic activation.
5. P2: Additional jurisdictions based on verified data and demand; professional workspaces, APIs/widgets, optional AI explanations, and commercial integrations. No paid AI dependency for basic calculation; no unverified filing, payment or compliance claims.

The simple workspace must not be described as a completed production service. Browser CI is separate from statutory verification. Existing release gates remain closed.


## Scoped assessment engines and calculation receipts

Germany (2026 EStG §32a) now has an ordinary taxable-income tariff with exact integer-rational arithmetic, whole-euro rounding and eligible joint splitting. Canada (2026) now has an ordinary federal taxable-income model with a non-refundable basic personal credit, including net-income-based phaseout. These separate assessment tools deliberately do not infer taxable income from salary. They do not activate the old German or Canadian rule fixtures or change production verification flags. See `rules/evidence/de-ca-2026-assessment-review.json` for source URLs, limitations and review scope.

India ordinary-salary examples reject taxable income above INR 5,000,000 because surcharge and associated marginal relief have not yet been implemented and verified.

TaxPulse example receipts contain input, result, SHA-256 content digest and an engine fingerprint derived from the bundled calculation sources. A local file checker validates integrity and replays the computation when the fingerprint matches. Receipts are unsigned and are not proof of identity, authenticity or statutory correctness. Earlier engine versions are not yet archived for browser replay. The preview continues to prohibit real financial inputs and all tax rules remain unverified.

The assessment API is `POST /v1/taxable-income/calculate`; its two input variants are described in OpenAPI. The public preview remains noindex, with no production route, payments or AI inference. Full independent statutory review, official calculator differential testing and historical engine retention remain open.

## Australia, Singapore and UAE scoped examples

All eight original jurisdictions now have at least one connected income-tax example. AU uses FY 2026–27 resident rates and LITO, SG uses YA 2026 chargeable-income rates before credits/rebates (2025 earnings), and AE accepts ordinary employee wages only. The older unverified country fixtures remain disabled. These models exclude broader taxation and payroll obligations; no production verification flags have changed. See rules/evidence/au-sg-ae-2026-review.json. The existing proof checker can replay the new models when the engine fingerprint matches.
