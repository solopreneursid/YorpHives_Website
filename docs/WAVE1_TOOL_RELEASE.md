# YorpHives V1.1 — Wave 1 Tools Release Report

**Release date:** 2026-11-15
**Status:** Verified on isolated preview, ready for founder-requested launch
**Site:** https://yorphives.com/
**Previous production:** `release/v1.0-rc6`, SHA `6ef7f94346248d1444e4f0bd8e538361cd821c1a`
**New release:** `release/v1.1-tools-rc1` (create from this document commit)

## Released Wave 1 tools (15)

| Category | Tool ID | Caveat |
|---|---|---|
| PDF | `pdf-compressor` | Rasterizes pages, potentially loses selectable text/forms/signatures; returns original when no size reduction |
| PDF | `pdf-to-images` | JPG/PNG page export; multiple pages as ZIP |
| Images | `image-size-target` | JPEG/WebP target; may reject extreme limits |
| PDF | `pdf-page-numbers` | Visible page numbering; existing signatures may be invalidated |
| PDF | `pdf-watermark` | Text watermark, not tamper protection |
| PDF | `pdf-visual-signature` | Visible typed signature only, not a cryptographic digital signature |
| PDF | `pdf-rearrange-pages` | Order must list every page exactly once |
| Images | `image-metadata-cleaner` | Re-encodes pixels, omitting common EXIF/GPS metadata |
| Images | `passport-photo-maker` | Two standard output dimensions; user must check issuing authority rules |
| Creator | `qr-code-scanner` | Decodes image QR codes but never visits them automatically |
| Business | `invoice-generator` | PDF invoices; user responsible for tax/legal requirements |
| Images | `image-ocr` | Locally hosted Tesseract.js with English model, heavier on first use |
| PDF | `pdf-to-text` | Selectable text only; scanned-image PDFs need OCR |
| Images | `svg-to-png` | Rejects scripts, external references and potentially dangerous SVG constructs |
| Creator | `barcode-generator` | Code 128, Code 39, EAN-13 SVG output; test scannability before printing |

## Preserved design and infrastructure

- The 92 original tool HTML pages are **byte-for-byte unchanged** compared with prior production, verified by Git tree hashes.
- `index.html` homepage, `app.js` Tool Launcher interface, the original hero and disabled Ko-fi buttons are unchanged.
- All original 23 first-party legacy redirects remain present.
- The catalog now lists **107** distinct tools with 107 direct canonical pages; sitemap lists **109** URLs (homepage + directory + tools).
- The full directory adds the Business category automatically; the Tool Launcher automatically accommodates it.
- Production and noindex preview builds remain separate. No new paid API, remote user-file processing or third-party runtime CDN was introduced.
- `_headers` adds only `'wasm-unsafe-eval'` to `script-src` to permit Tesseract WebAssembly; general JavaScript `'unsafe-eval'` is **not** enabled.
- Dependencies are pinned in `package.json` and copied at build time to the site's own `/tools/vendor/`. MIT/Apache notices are documented under `tools/vendor/README.md` and included with copied assets when present.
- Preview-only browser QA scripts do not ship in production output.

## Test evidence

1. Cloudflare `yorphives-v1-review` published a full preview with locally installed dependencies, 107 pages, 109 canonical URLs and all 23 redirects.
2. Automated build/test system: **143 Node tests passed, 0 failed** in production-mode and preview-mode builds.
3. Browser processing QA: all 15 planned operations worked in headless Chromium; extra checks included SVG script rejection and a genuine image-heavy PDF compression reduction.
4. Compression evidence: a synthetic **1,192,016-byte** PDF containing a large embedded PNG was reduced to **37,514 bytes** and remained a valid one-page PDF.
5. Self-hosted English OCR correctly recognized **HELLO WORLD**. Both the OCR and QR scanner passed end-to-end actual tool-page download tests.
6. All 15 individual tool-page interfaces passed checks covering form submission, file pickers (where needed), downloadable object URLs, and output file signatures/content.
7. Tool Launcher layout and navigation: **40 checks passed** across 320px, 375px, 768px, 1280px.
8. Existing legacy functions are not required; the retired prototype and processing API remain deleted.

## Limitations and future follow-ups

- Browser tests used Chromium. Safari, Firefox and physical-device workflows have **not** been fully exercised. Keep a visible error path for unsupported browser capabilities.
- Image OCR is English-only. Recognition accuracy depends on image quality and first-use model download/compilation.
- Large PDFs and images can consume significant device memory; numerical and page-count limits are enforced.
- PDF compression rasterization loses some document semantics. This is explicitly disclosed on the tool page.
- For a future optimization, add reproducible package-lock and use a dependency-security review before updating packages.
- Retain current-production rollback branch `release/v1.0-rc6`. Never delete the production or staging Pages projects, the Headquarters Worker, or the five Headquarters staging backups.

## Deployment/rollback controls

**Deployment:** Freeze exact commit on `release/v1.1-tools-rc1`; change only the `yorphives-v1-live` project's production branch (automatic production redeployments remain disabled), and initiate one manual production deployment. Verify all tool URLs, home, sitemap, headers and legacy redirects after deployment.

**Rollback:** If production smoke checks fail, switch the production Pages project to the old branch and initiate a manual deployment of `6ef7f94346248d1444e4f0bd8e538361cd821c1a`. Avoid DNS or domain changes because both domains already point at the same `yorphives-v1-live` Pages project.
