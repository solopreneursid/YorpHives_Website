# Edge-native production Workers cutover — protected rollout

Production Worker name: `yorphives-edge-static-live`. It uses the existing production D1 database; its `workers_dev` subdomain is **disabled**, and no custom domains or routes are declared in Wrangler. Uploading this Worker has **no production traffic impact**.

## Before creating zone routes

Cloudflare Pages must retain `yorphives.com` and `www.yorphives.com` and both proxied CNAME records pointing to `yorphives-v1-live.pages.dev`. Store the current Pages deployment ID, the Workers version ID, the zone route list and both D1 IDs as release evidence.

Verify: the isolated Worker pilot's complete 143-page sweep, its file-processing Chromium test, mobile test, external live parity, _headers, redirects and both API contracts. Production-style release check must pass with no preview noindex. Confirm the production Worker has only `ASSETS` and `INSIGHTS_DB=yorphives-impact-analytics-live` bindings. No HQ or repository-write permissions.

## Atomic cutover and rollback

The Workers Route patterns will be exactly `yorphives.com/*` and `www.yorphives.com/*`. Create each route through Cloudflare's zone Workers Routes API, **without changing DNS or deleting Pages custom domains**. Routes run before the proxied Pages origin; the Worker serves versioned static assets and executes the narrowly scoped /api/ gateway.

After each route creation, immediately run GET/HEAD public smoke checks, 143 routes, canonical URLs, unknown 404, legacy 302, agent discovery, read-only API, production D1 aggregates, no preview-only scripts and no `X-Robots-Tag: noindex`. Do not insert synthetic production analytics events.

**Rollback:** DELETE both newly created zone Worker route IDs via Cloudflare API. Because both proxied CNAME records still target the existing Pages origin and Pages custom domains were never removed, page requests fall back to the prior Pages deployment. Verify 200 on homepage/tool page, correct live D1 reporting and removal of the two route patterns. Rollback of code does not restore altered D1 data—never mutate D1 as part of rollout.

If the Cloudflare API refuses a route, returns ambiguous result or checks fail, abort/rollback. Never delete Pages or change MX/TXT/email DNS. Cloudflare edge route propagation may not be immediate; repeat checks in multiple locations before declaring completed.

## Operation

Production Worker build from the tested release branch:
```bash
npm install --progress=false
node scripts/build-site.mjs --target=production
node --test tests/*.test.mjs
node scripts/release-check.mjs dist
npx wrangler deploy --config edge/live/wrangler.jsonc
```
The new Worker keeps production Static Assets and APIs in the same version. All image/PDF operations stay browser-local. A rollback remains possible by removing the routes and reusing Pages.

**Important:** The first build only creates an inactive Worker. Traffic cutover is a separate controlled operation with independent rollback checks, not an automatic Git push.
