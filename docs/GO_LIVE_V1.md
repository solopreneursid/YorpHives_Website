# YorpHives — production launch runbook (V1, 92 tools)

**Status: PREPARED, NOT APPROVED FOR CUTOVER.** Preserve the existing website and its Cloudflare Pages Functions. The founder must explicitly approve any live-domain change. This file is operations-only and is not copied into public website assets.

## Verified release candidate

- Source: `solopreneursid/YorpHives_Website`, branch `yorphives-frontend`.
- New site: 92 independent local-browser tools, 94 sitemap URLs, responsive navigation and disabled Ko-fi buttons.
- Preview: Cloudflare Pages project `yorphives-v1-review` at `yorphives-v1-review.pages.dev`, build directory `dist`.
- Preview build: `node scripts/build-site.mjs --target=preview && node --test tests/*.test.mjs && node scripts/release-check.mjs dist`.
- Production build (never use for the preview's publicly accessible deployment): `node scripts/build-site.mjs --target=production && node --test tests/*.test.mjs && node scripts/release-check.mjs dist`.
- Run production-mode validation first, then rebuild as preview and deploy ONLY the preview artifact; audit Cloudflare build logs to confirm both checks and the final `previewNoindex=true`.
- Do not modify pre-existing tool pages, the homepage, or the disabled Ko-fi buttons during release preparation.

## Live production baseline (read via Cloudflare API on 2026-11-15)

- Pages project: `yorphives`; Git repository `solopreneursid/YorpHives`, branch `main`.
- Confirmed **production** deployment ID: `3bc44682-15a3-476a-ba28-8fe89889c945`, commit `b38239c49edce4d6be5962a84980373bb4918e65` (2026-11-09).
- Domain aliases: `https://yorphives.com` and `https://www.yorphives.com`.
- Production deployment has Cloudflare Pages Functions (`uses_functions=true`).
- Confirmed production static routes include `/free-tools/`, `/free-tools/file-studio/`, `/index.html`, `/robots.txt`, and `/sitemap.xml`.
- Newer `feature/connect-2026-open-agentic-web-20261114` deployment is a *preview*, not production. Do not confuse the `latest_deployment` field with the current production deployment.
- Automated production deployments are disabled on the existing Pages project. Preserve this setting unless authorized.
- The older source repository is **not accessible** through the current GitHub connector. Do not assume the old Pages Functions can be recreated or migrated without access.
- Cloudflare DNS for apex and www currently resolves to `yorphives.pages.dev` (proxied). Keep all email-related MX/TXT records unchanged.

## Hard release blockers

1. **Legacy functionality:** obtain source access or independently verify all Pages Functions endpoints and old File Studio behaviors; decide how to keep existing features operational. Do NOT silently delete or replace legacy functions.
2. **Legacy URLs:** ensure `/free-tools/` and `/free-tools/file-studio/` remain useful, with reviewed preservation, proxying or deliberate user-facing redirects. Avoid generic redirects to unrelated tools.
3. **Browser acceptance:** verify at least Chromium and Firefox; 320, 375, 768 and 1280 px; keyboard, screen readers and contrast; 92 direct URLs; representative PDF/image/ZIP/XLSX/PPTX processing and downloads; no external file uploads.
4. **Preview response headers:** verify server-sent `X-Robots-Tag: noindex, nofollow`; verify first-party CSP, no fatal console errors and consistent MIME types.
5. **Production-mode build:** verify `/robots.txt` points to the live sitemap; `_headers` does not contain preview `noindex`; all 94 canonical sitemap URLs and 92 direct pages present.
6. **Founder authorization:** final preview and explicit approval to change production domain/project configuration, with a reviewed maintenance and rollback approach.

## Reversible release procedure — planning only (do not execute automatically)

1. Freeze the release candidate by commit SHA and store the asset/build proof. Confirm the Pages production deployment ID **by environment**, not by project `latest_deployment`.
2. Export or securely record old Pages settings, DNS settings, legacy function routes, and the currently active production deployment ID. Keep the existing `yorphives` project intact.
3. Preserve the older site under a separately approved legacy hostname or migrate all relevant legacy functionality before the new platform receives `yorphives.com`. Never add an unverified redirect for File Studio.
4. Build the *production* static output from the frozen SHA; verify `robots.txt`, sitemap, canonicals, security headers and a representative feature sample.
5. Independently test the new production asset set on a controlled, non-indexable endpoint. An indexable `.pages.dev` preview is not acceptable.
6. Only after founder approval, perform the domain cutover under a controlled process that preserves mail DNS and the original Pages deployment. Verify apex and www, critical old routes and new tool pages.
7. If health checks fail, revert domain routing/project source changes and use Cloudflare's Pages deployment rollback to restore the old production deployment; re-verify apex, www and legacy Pages Functions before declaring rollback successful.

## After launch

- Google Search Console property verification and submission of `https://yorphives.com/sitemap.xml`; monitor indexing of individual tools (no guaranteed search ranking).
- Passive availability and error monitoring, dependency checks and observed performance with no paid processing APIs.
- Retain operational records for rollback. HQ agents are observation-only and must never gain repository-write, Pages-deployment, domain-edit, or credential-management permissions.
