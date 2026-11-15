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
