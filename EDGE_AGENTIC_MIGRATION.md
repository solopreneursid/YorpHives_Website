# YorpHives Edge-Native and Agentic Internet Architecture

Status: staged migration. Cloudflare Pages + Pages Functions currently serves production. A compatible Worker gateway is implemented in `edge/worker.mjs` but **has not replaced the production hostname**.

## What is already edge-native

- CDN-distributed prerendered site pages and browser-local tool bundles; existing SEO, canonical links and redirects are preserved.
- Isolated Cloudflare Pages Functions routes for anonymous opt-out-aware first-party analytics on D1.
- Separate staging and production D1 databases.
- Existing HQ remains a separate authenticated, observation-only process. No shared write credentials.

## Architecture target

1. **Static assets:** build with `node scripts/build-site.mjs --target=production`; publish exact `dist/` via Workers Static Assets. Free static delivery bypasses Workers compute when the asset is matched.
2. **API gateway:** `edge/worker.mjs` routes ONLY `/api/insights/{collect,public,growth}` and `/api/agent/v1/{capabilities,openapi.json}`. It imports the existing portable aggregation modules rather than reimplementing event logic. All other paths are served via `env.ASSETS.fetch`.
3. **Database:** `INSIGHTS_DB` is the existing D1-compatible SQL adapter. Keep production database `yorphives-impact-analytics-live` distinct from preview `yorphives-impact-analytics-preview`. No migration/copy of staging events.
4. **Product catalog:** a founder-approved static `/catalog.json`, canonical URLs, SEO schema and sitemap are source of truth. No unreviewed products.
5. **Agent discovery:** the read-only capabilities API uses JSON, OpenAPI 3.1, `llms.txt`, a site-specific `/.well-known/agentic.json`, and progressively registers one optional browser-local WebMCP discovery tool when the browser supports it. This well-known URL is **not** claimed to be a standard registry. WebMCP remains experimental. No unauthenticated remote action endpoints, MCP proxy or agent-driven purchases are offered.
6. **Files:** free browser-local transformations are retained. R2 or server-side execution should only be added for a specific user-approved product need.
7. **Portability:** all agent contracts are independent of Cloudflare; dynamic operations use Web Request/Response, SQLite-compatible SQL and an injectable `ASSETS` adapter. A self-hosted runtime and SQLite can implement the same contracts without another intermediary.
8. **Content licensing:** do not infer universal reuse/training permission. Only publish content signals after founder policy review.

## No-downtime rollout gates

**Gate A — current Pages production:** Add the agent-discovery endpoints as narrowly scoped Pages Functions, keep existing frontend, D1 and live domain. Test the production-style build, preview-style build, 143 tool routes, website headers/redirects, analytics and live API availability.

**Gate B — Workers Static Assets PILOT (not live domain):** Build the same `dist/` and deploy `edge/worker.mjs` to a *new isolated* Worker with `ASSETS` and the preview D1 binding. Use Cloudflare CLI `cf` (the repo has no Wrangler config). Retain `_headers` and `_redirects` from dist. Confirm 404s remain real 404s, not SPA fallbacks. Explicitly check Worker version + static asset version parity, HTTP status, page routes, compressed model assets, tool WASM, sitemap, SEO, WebMCP feature detection and anonymous opt-out behavior.

**Gate C — operational and security review:** Test authenticated founder controls (separate HQ), database retention, duplicate submissions, Rate Limit/WAF behavior, rollback, requests with DNT/GPC, robot handling, mobile UI, Lighthouse and synthetic runs. Verify a pilot request cannot access production D1.

**Gate D — domain cutover only with evidence:** Point `yorphives.com` to the Workers Static Assets Worker only when Gates A-C pass and a tested rollback to the existing Pages route is available. Do not delete the existing Pages project or databases. Do not claim serverless Workers deployment complete before domain cutover is verified.

## Cost and lock-in

No new subscriptions or proprietary inference required. Cloudflare Workers/D1 is still managed infrastructure—not self-hosted. The architecture remains portable at the app/API contract layer, but truly independent operation will later require replacing Workers and D1 with your own edge proxy, serverless execution environment and SQLite/PostgreSQL. Workers Free compute limits and deployment asset limits must be checked against current official documentation before cutover.
