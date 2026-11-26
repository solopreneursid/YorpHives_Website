# TaxPulse Global 2.0 — proposed roadmap
Date: 2026-11-25. Planning only; no release authorization.

## Goals
Decision-first salary, tax, career, relocation and money tools. Browser-local by default, no mandatory account, accessible plain language, durable low-cost architecture. Preserve existing engines and tests. Do not advertise unsupported calculators as available.

## Product
Home directory; Salary; Taxes; Career; Work Abroad; Money; Business. Dedicated stable URLs, country and period selectors, common scenario input, progressive disclosure, accessible charts and downloadable reports. Start with existing eight countries; prioritize verified India salary and tax depth, then other existing supported profiles. Distinguish gross, CTC, employer cost, taxable income, net pay, disposable cash and subjective benefits.

## Architecture
Static HTML/CSS/ES modules and Cloudflare Worker; no new service by default. Separate presentation, scenario validation, country adapters, pure arithmetic, report generation and source evidence. Use integer minor units or exact decimal arithmetic; explicit currencies, periods, rounding and eligibility. Version rule sets and external data independently. Public registry of capability scope and status, enforced at runtime and in UI/API. No silent fallback. Existing legacy release gate stays intact until a reviewed replacement proves route-level scoped eligibility. Public aggregate FX/PPP datasets may be cached with dates and redistribution rights; manual overrides remain available. No salary data sent to third-party providers. Optional local scenario storage with explicit consent and deletion; no cloud account in initial release.

## Delivery
31: inventory, design system, dedicated route shell, navigation, dashboard and accessibility. 32: normalized scenario and result contracts; adapters around current engines; migration tests. 33: decision dashboard, cash waterfall, side-by-side offers, editable budget, sensitivity analysis. 34: India CTC and deductions, existing country scope expansion and statutory evidence. 35: licensed FX/PPP data, manual costs, dated national benchmarks; no fabricated city data. 36: relocation and career break-even; cash and noncash separate; negative and never-break-even cases. 37: tax-saving eligibility and explainable regime comparisons; no personalized legal recommendation without basis. 38: useful country-specific content and SEO, no indexation of unapproved calculators. 39: privacy-respecting revenue, disclosures, optional premium after usage validation. 40: full CI, browser, dependency/security, resource, rollback, statutory and founder acceptance.

## Release milestones
A: dedicated routes, existing engines preserved; staging verified. B: connected salary/career/budget decision workflow with deterministic reports. C: independently verified initial country scopes and launch controls. D: optional international datasets and expansion. Do not delay milestone C solely for later features. No production deployment without explicit authorization.

## Acceptance
At least 90% of representative usability-test participants complete a basic salary task without help (target, not measured); no horizontal overflow at 320px, WCAG 2.2 AA target, keyboard accessible, mobile LCP target <=2.5s at p75 when field data available. All release fixtures and browser tests pass, no unresolved critical/high security findings, source evidence for each enabled statutory scope, stale data marked, no unsupported output presented as verified. Verify hosted preview revision and rollback. Independent reviewer signoff remains outstanding.

## Risks
Unverified statutory rules, broad legacy gate incompatible with scoped launch, dataset rights/freshness, FX vs purchasing power confusion, browser performance on low-end devices, uncontrolled scope expansion. Do not relax gate or fabricate verification. Current hosted preview may lag source; verify deployment explicitly. All decisions here are proposed, subject to review.
