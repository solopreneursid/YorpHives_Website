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

## Legacy URLs and functions discovered by read-only browser inspection (2026-11-15)

- The current public `/free-tools/` directory contains **21 individual tool links** plus a link to File Studio. Cloudflare Pages Functions dynamically serve many of those paths, even though their HTML assets do not appear in the static manifest.
- `yorphives.pages.dev` has been independently checked to serve the preserved old homepage, File Studio, `/free-tools/split-pdf/`, and `/free-tools/grayscale-image/`.
- The candidate adds **23 reversible, temporary 302 redirects** in `_redirects` to protect the directory, 21 tool URLs and File Studio. It redirects 20 old links to functionally matching modern tool pages; File Studio, grayscale-image, and split-pdf remain accessible through the preserved old Pages domain (3 redirects).
- Do not delete, repurpose, or remove the old `yorphives` Pages project or disable its Functions during launch. Keep `yorphives.pages.dev` functional.
- The Cloudflare Pages preview project has no Functions; `_redirects` is served from its static `dist/` output. No redirects are applied to modern `/tools/` URLs.
- Legacy routes have only been verified individually for a subset of tools using Browser Rendering. The complete route set and old PDF/image actions still require browser acceptance testing.
- `api.yorphives.com` is routed to an existing, separate worker `yorphives-processing-api`; migration must preserve that worker's domain and its R2/Durable Object bindings. No changes to this worker are authorized.

## Browser and release-gate verification evidence — 2026-11-15

### Real HTTP and crawler behavior

The Cloudflare Browser Rendering `snapshot` endpoint confirmed the real responses from `yorphives-v1-review.pages.dev`:

- `/` and `/tools/word-counter/` respond **HTTP 200**, with `X-Robots-Tag: noindex, nofollow`, the expected first-party `Content-Security-Policy`, and `X-Content-Type-Options: nosniff`.
- `/free-tools/json-formatter/` responds **HTTP 302** with `Location: /tools/json-formatter/`; the final page responds 200 and remains noindex in preview.
- `/free-tools/file-studio/` responds **HTTP 302** to `https://yorphives.pages.dev/free-tools/file-studio/`, preserving the old application.
- Browser content checks also confirmed links to old Split PDF and image converters still reach a working page.
- The actual preview deployment logs report **23 valid redirect rules** and the correct header rule. Production-mode builds do not include the preview noindex header.

### Browser acceptance checks

Read-only Cloudflare headless Chromium browser checks (not Firefox):

- The homepage latest-tool cards load successfully from the local catalog.
- The Ko-fi controls are visible, semantically disabled and noninteractive in desktop (1280px) and phone (375px) accessibility trees.
- A direct-entry file tool displays its name, input control, Process button and download affordances.
- **9 of 9 real Chromium processing checks passed:** ZIP creation, SHA-256 duplicate detection, batch UTF-8 text replacement, CSV→XLSX→JSON roundtrip, PDF merge, PDF extract, Canvas image crop, images→PDF, images→PPTX.
- **6 of 6 end-to-end UI checks passed:** PDF Merge, Image Cropper, CSV→Excel, Batch Find and Replace, ZIP Creator and Duplicate File Finder. A synthetic local file was selected via the actual HTML file picker; the real Process button was submitted and the generated browser download Blob was verified by signature/content.
- Browser test modules `/browser-smoke.mjs` and `/browser-interaction.mjs` exist only in the protected preview output. Production builds fail the test gate if either would leak into public assets.
- Automated production and preview builds each report **131 Node tests passed, zero failed**. This is additional to the browser checks.

### Remaining acceptance/operations gates

- Still unverified: Firefox, Safari and physical phone browser interactions, comprehensive responsive visual overlap, screen-reader/keyboard traversal, production-domain HTTP responses and complete legacy Pages Functions runtime behavior.
- The original `yorphives` Pages deployment stays unchanged and must remain usable at `yorphives.pages.dev`. Its separate `api.yorphives.com` Worker must remain unchanged.
- Final founder authorization is mandatory before moving custom domains, changing DNS records or production deployment sources. Use the exact frozen release SHA, not an unreviewed development branch.
- When publishing the final production build, verify response headers no longer include `X-Robots-Tag: noindex`, verify apex and www, verify all 23 old URLs, then request sitemap indexing. Prepare immediate domain/DNS rollback to old project if critical checks fail.

## RC4 — compact Tool Library UX, zero-cost growth (2026-11-15)

- Replaces the long, 92-card `/#tools` listing with a search-first collection of **12 compact cards initially** and progressive **Show more** batches of 12.
- Filters are generated from the public catalog: **12 categories**, an All tab, a locally stored Saved tab, responsive horizontally scrollable chips, a search field with phrase aliases, and recent/A–Z/Z–A sorting.
- Favorites are **local-only** in the visitor's browser using `localStorage` with safe fallback when storage is unavailable. No account, hosted database, paid AI service, or external API is required.
- The Free Tools hero and section spacing are reduced, scoped to `#tools`. The independent homepage visual identity, studio areas, other page sections, Ko-fi disabled controls, and **all 92 individual tool pages** are unchanged.
- The full `/tools/` directory uses semantic `<details>` category accordions for compact browsing. Every tool link is present in the server-rendered HTML even while collapsed; the directory category groups, counts, links and descriptions are rebuilt from `catalog.json` automatically at every release. Search engines and agents continue to reach each tool independently.
- Production and preview builds passed **135 automated Node tests each, 0 failures**. Actual Cloudflare Chromium library interactions passed **10 of 10 checks at each width of 320, 375, 768 and 1280px** (40 checks total), including search relevance, empty/reset, categories, local favorites, progressive results from 12 to 92, disabled Ko-fi and no horizontal overflow.
- HTML response checks: 12 generated directory groups, 92 direct anchors, HTTP 200, preview `X-Robots-Tag: noindex,nofollow`.
- Preview-only QA is `/library-qa.mjs`. The release build excludes it from production.
- **Old live site `yorphives.com` is untouched.** This new version is staged, not yet approved for custom-domain cutover. Use the frozen `release/v1.0-rc4` SHA for review; do not merge drafts or auto-deploy from moving feature branch.

Release gate remains: founder authorization and prudent production cutover while retaining the old Cloudflare Pages deployment, legacy Functions and `api.yorphives.com` worker.

## RC5 — Tool Launcher redesign (2026-11-15)

**Only the Free Tools browsing interface beneath the hero was redesigned.** The original `Little tools / Big momentum` hero HTML is byte-for-byte identical to RC4. The existing studio homepage, all 92 individual tool pages, `catalog.json`, the comprehensive HTML directory, its automatic category generation, the sitemap and 23 legacy aliases remain unchanged.

- Desktop: navy category sidebar, a compact 8-row results panel, direct Open links, Previous/Next page controls, prominent natural-language task search, name sorting, and local-only `My tools` favorites.
- Mobile/tablet: category shortcuts in a two-column launcher, context-sensitive back button and compact result rows. Browsing mode exposes seven comprehensible category groups, combining the original 12 catalog categories. Unknown future categories are automatically given their own group and are never silently dropped.
- The results panel stays at **8 per page**, rather than growing on every click. Empty searches collapse the result panel and display a helpful prompt immediately.
- All direct-entry URLs are still present in `/tools/` and `/sitemap.xml`, preserving Google/agent discovery without requiring an intermediary landing page.
- Cloudflare staging `yorphives-v1-review`: production build **135 Node tests passed / 0 failed**, preview build **135 passed / 0 failed**, valid 94-URL sitemap, 23 legacy redirects, and staging `noindex`.
- Preview-only real Chromium interface QA passed **10/10 at widths 1280, 768, 375 and 320px** (40 checks), covering page navigation, search, no results, category groups, favorites, sorting, mobile shortcut selection, disabled Ko-fi and horizontal-overflow verification.
- This development build is not yet authorized for `yorphives.com`. Founder-controlled cutover and preservation of the old Cloudflare Pages project remain mandatory.
