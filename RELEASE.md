# YorpHives V1.0 release gate

This is a **candidate**, not a production deployment. The 90 browser-local tools are maintained on `yorphives-frontend` and must not be deployed directly to `yorphives.com` before the checks below pass.

## Required commands on an owner-controlled Linux machine

With Node.js 22+ installed, from the website repository root:

```sh
node --test tests/*.test.mjs
node scripts/release-check.mjs
```

No npm install, paid APIs, hosted CI vendor or remote test runner is required for these commands. Interactive testing requires locally installed current Chromium and Firefox. Open `http://localhost:8000` after starting `python3 -m http.server 8000` from the project root. Test the homepage, search/category filters, all file downloads, CSV/JSON utilities, PDF and Office workflows, and 320px/375px/768px/1280px layouts. Test with a private browsing session and verify the browser sends no file data to an external host.

## Cloudflare deployment safety

The existing Cloudflare Pages project `yorphives` is connected to GitHub `solopreneursid/YorpHives` (production branch `main`), **not** to `solopreneursid/YorpHives_Website`. Production deployments are currently disabled. The separate 90-tool repository cannot be assumed to publish to the live domain. Preserve the existing production deployment, verify a preview of the correct repository, independently inspect the proposed asset set and paths, and obtain founder approval before switching the live domain or production source.

## Release sign-off

- [ ] Node test suite exits successfully on the final commit.
- [ ] Offline static release check exits successfully on the final commit.
- [ ] Browser checks pass in Chromium and Firefox.
- [ ] Files remain local and no upload is made during processing.
- [ ] Keyboard, mobile and screen-reader checks pass.
- [ ] Third-party code/license inventory and CSP/security headers reviewed.
- [ ] Production project/source mismatch resolved with founder approval.
- [ ] Known-good deployment and rollback method recorded and tested.
- [ ] Founder approves the final preview and deployment.

Never promote a draft PR or switch the Cloudflare production source automatically.

Before any live cutover, generate and validate the sitemap (`node scripts/generate-sitemap.mjs`) and verify Cloudflare Pages serves `_headers` correctly. Ensure the final preview has no CSP errors, no unavailable resources and no cross-origin file-processing requests.

## Verification evidence (2026-11-15)

- All 90 tool pages passed static inspection for page titles and referenced local links; no broken local asset link was found in that inspection.
- Targeted behavioral checks passed for JSON lexical key ordering, safe CSV number/formula handling, HTML escaping and the 14 MB ZIP-directory roundtrip.
- The existing 12 MB Office archive limit remains active; the separate ZIP directory viewer supports up to 36 MB.
- All canonical site and tool URLs are in the 92-entry sitemap; privacy-oriented security headers are present in source.
- **Not yet verified:** the complete Node.js test suite, Chromium/Firefox behavior, accessibility, real Cloudflare header behavior, and production rollback. These require a runnable build and staging site.
- **Cloudflare blocker:** An attempt to create an isolated Pages project named `yorphives-v1-review` connected to `solopreneursid/YorpHives_Website` was rejected with HTTP 401, Pages Git integration error code `8000011`. No production project or live domain was changed. The existing `yorphives` Pages project still points at `solopreneursid/YorpHives`.
- **Founder action required:** In GitHub settings, configure the **Cloudflare Workers and Pages** GitHub App to allow access to `YorpHives_Website`. If the existing installation is inaccessible, reauthorize the Cloudflare app from the Cloudflare Pages Git integration UI, preserving the existing live project. Retry a separate staging project build with `node --test tests/*.test.mjs && node scripts/release-check.mjs` and destination `.`.

**Go-live decision: HOLD until the source connection, full suite and browser preview are verified.**

## Universal discoverability and preview indexing protection (2026-11-15)

The preview build command is now `node scripts/build-site.mjs --target=preview && node --test tests/*.test.mjs && node scripts/release-check.mjs dist`, with Cloudflare Pages output directory `dist`. This creates direct canonical HTML pages for public catalog entries and applies a preview-only noindex response header while preserving the homepage visual content. Never connect `yorphives.com` to the review project. The production command uses `--target=production` and is founder-gated. Follow `SEO.md` when adding future tools, apps, products or services. No automated promotion of the new build to the live domain is authorized.
