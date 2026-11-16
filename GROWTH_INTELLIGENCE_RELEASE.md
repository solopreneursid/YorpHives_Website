# YorpHives Growth Intelligence — read-only contract

## API

`GET /api/insights/growth` provides a rolling 30-UTC-day daily series, seven-day comparisons, approved public tool rankings, and *investigation signals*. It uses the existing `INSIGHTS_DB` D1/SQLite tables. No migrations, cookies, visitor fingerprints, new billing service, or email notifications are required.

- `daily[].pageViews`: counted section/page views.
- `daily[].completedActions`: browser-reported successful tool actions for currently published/qualified catalog entries.
- `comparison`: recent seven complete UTC calendar day buckets including today versus preceding seven buckets. The current day may be partial.
- `ranked`: maximum ten approved tools/products with observed completed actions in the last 30 days.
- `opportunities`: at most five candidate investigations when a currently approved tool has 3+ completions in the recent seven days and more than in the prior seven. **These are not business recommendations or verified demand.**
- `revenue.available=false`: revenue is unavailable until an independent authenticated, founder-approved verified revenue source is connected. No invented earnings.

All response fields are aggregate-only. HQ can fetch this JSON for observation and evidence-backed research but **must not** use this API to write code, alter approval flags, deploy, or perform site operations. HQ integration remains a separate read-only consumer task.

## Release gates

1. Run `node --test tests/growth-intelligence.test.mjs`, the complete existing test suite, and both target build/release checks.
2. Verify the Cloudflare *preview* deploy is successful, then GET its `/api/insights/growth` endpoint; ensure the binding is to the preview D1 only.
3. Confirm the live database remains separate, and do not copy staging test rows.
4. Promote only after the final preview commit passes; test live endpoints and rankings against the live DB. Zero is legitimate if no live events have occurred.
5. Ensure preview remains noindex and the existing production rollback remains available.

This endpoint does not claim unique humans, verified conversions, or revenue, and does not expose session hashes. A future self-hosted SQLite adapter can preserve the same JSON contract.
