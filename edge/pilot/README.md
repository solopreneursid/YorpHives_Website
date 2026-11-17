# Isolated Workers Static Assets pilot

A separate, intentionally non-production Worker named `yorphives-edge-static-pilot` runs the **same website build** from `dist/` using Cloudflare Workers Static Assets and the existing portable `edge/worker.mjs` gateway.

## One-command build and deploy

From the repository root, after installing dependencies:

```bash
npm ci
node scripts/build-site.mjs --target=preview
node --test tests/*.test.mjs
node scripts/release-check.mjs dist
npx wrangler deploy --config edge/pilot/wrangler.jsonc
```

This pilot is isolated at its Workers subdomain, **not** yorphives.com. It uses D1 `yorphives-impact-analytics-preview` and never binds `yorphives-impact-analytics-live`. HTML and crawlable tool pages remain noindex. API routes run Worker code; static asset hits bypass edge compute. `_headers` and `_redirects` are part of `dist/`. No third-party agent intermediary is introduced. The pilot can be deleted without changing the live website.

## Verification required before domain cutover

- Run homepage, tools directory, at least one of each tool family, model and WASM assets, redirects, `robots.txt`, sitemap, `llms.txt`, discovery API and OpenAPI smoke checks.
- Verify all 143 tool public pages, stable content hashes, no unintended 200 fallbacks for missing pages, responsive frontend, accessibility and file-local processing.
- Check HTTP methods, origins, data-retention, opt-outs, same-origin analytics, duplicate events and DB isolation.
- Confirm the Worker deployment points at the current build; load the exact Worker version. Ensure no production D1 usage from the pilot.
- Independently verify rollback by keeping the existing `yorphives-v1-live` Pages project and its domains untouched.
- Only after all checks should production cutover be considered. Never change the production Pages DNS or domain binding as part of the pilot.

This pilot intentionally uses explicit Wrangler configuration **only within `edge/pilot/`**, independent of the live Pages deployment process. App code remains portable across edge platforms.
