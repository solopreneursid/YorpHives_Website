# YorpHives Impact — public growth and evidence policy

**Status:** Design-first, preview branch only. Do not deploy to `yorphives.com`.
**Scope:** Homepage section between HQventures and Free Tools. Existing pages, memberships,
tools, browser-local processors, YHpulse, and HQ boundaries remain unchanged.

## Business goal

Demonstrate that YorpHives is a cloud-based, AI-powered venture studio that earns
trust through real products, activity, partnerships, and verifiable results.
Avoid vanity statistics, simulated success, or financial data leakage.

## What is implemented now

- Four responsive metric cards: published utilities and founder-qualified
  launched ventures (derived from `catalog.json`); estimated unique visitors
  (last 30 days) and verified partnerships (withheld until validated).
- Revenue-direction visualization: disabled until an approved trend-only
  summary is published; never includes currency, totals, proportions,
  percentages, source transactions, or financial tooltips.
- Trending HQventures: becomes visible only when a verified, ordered list of
  real, publicly launched and founder-qualified products is approved.
- Milestones: only dates and summaries with proof paths that exist in the
  published catalog. No invented achievement history.
- Concise verification indicator that correctly describes the approval boundary.
- Responsive 320px/390px/tablet/desktop layouts; reduced-motion support;
  locally hosted CSS/JS, no external UI/analytics libraries.
- One **static, versioned snapshot**, `impact-public.json`. All unverified
  fields are null or empty. Public code contains no private financial data.
- No analytics data collection or tracking has been added. This is a UI and
  data-contract foundation, not a claim that live analytics are operational.

## Future read-only aggregation contract

A founder-approved publisher may replace `impact-public.json` using the
following stable shape after independently verifying source evidence:

```json
{
  "schemaVersion": 1,
  "publication": {
    "status": "approved",
    "approvedByFounder": true,
    "approvedAt": "YYYY-MM-DD"
  },
  "metrics": {
    "estimatedVisitors30d": null,
    "verifiedPartners": null
  },
  "revenueDirection": [],
  "trendingApps": [],
  "milestones": []
}
```

`revenueDirection` contains chronological `{ "month": "YYYY-MM",
"direction": -1 | 0 | 1 }` records. Direction is decline, stable, rise.
Only the directional shape appears publicly; the actual revenue amounts
remain in private company storage. This is still commercially informative
and must be explicitly approved.

`trendingApps` contains `{ "url": "apps/approved-slug/" }` entries, in
verified order. The renderer discards unqualified products and duplicates.
Do not include exact usage volumes or user identifiers.

`milestones` contains `{ "date": "YYYY-MM-DD", "title": "...",
"summary": "...", "proofUrl": "tools/published-slug/" }` entries.
Every proof path must match an actual published catalog record. All
dates and claims must be independently verified.

**Do not approve a snapshot by merely toggling `approvedByFounder`.**
Founder approval requires documented evidence, scope review, and the
controlled release of this specific published aggregate. The frontend is
a display gate, not a cryptographic attestation or an authentication system.

## What still needs integration

1. Privacy-aware first-party aggregate analytics with clearly defined
   estimated-unique-visitor methodology and a bounded time window.
2. Separate verified partner register and founder-confirmation evidence.
3. Private real-finance aggregation producing ONLY direction summaries for
   approved public release.
4. Verified product-usage and launch event aggregation, excluding bots,
   replayed events, internal tests and invalid traffic.
5. Independent measurement QA, retention policy, and compliance review.
6. Founder-controlled signing/release workflow and rollback for approved
   snapshot changes, ideally with an auditable immutable evidence digest.

YorpHivesHQ remains observation/research/analysis/recommendation-only.
It cannot approve achievements, write website code, publish sensitive
metrics, or deploy to the live site. The founder controls changes.

## Visual and engineering constraints

- Component owns its styles in `impact.css`; no accumulating layout patches.
- `impact.js` uses local fetch + already-approved public catalog only.
- Dynamic output uses `textContent` or `createElement`, not inserted HTML.
- No third-party analytics scripts, fingerprinting, sessions, cookies,
  per-user profiles, remote fonts, or expensive continuous DB polling.
- Static JSON has `Cache-Control: no-store` and preview remains noindex.
- Preserve `prefers-reduced-motion` and touch/keyboard navigation.
- Empty states are intentional. Do not place decorative fake graphs or
  counters under a label that might be mistaken for genuine data.
