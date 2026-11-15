# Wave 1 — fifteen new browser-local tools

Release: YorpHives 1.1, frozen release candidate after staging sign-off
Date: 2026-11-15 (Asia/Kolkata)
Source: `yorphives-frontend` → pinned `release/v1.1-rc1` branch.
Live previous release: `release/v1.0-rc6` at `6ef7f94346248d1444e4f0bd8e538361cd821c1a`.

## Added tools (15)

| Tool ID | Category | Implementation |
| --- | --- | --- |
| pdf-compressor | PDF | Optional lossy raster conversion; if not smaller, original returned |
| pdf-to-images | PDF | PDF.js JPG or PNG page export (ZIP for multiple pages) |
| image-size-target | Images | JPEG/WebP image-size targeting via local canvas |
| pdf-page-numbers | PDF | Visible page number overlays using pdf-lib |
| pdf-watermark | PDF | Visible diagonal watermark using pdf-lib |
| pdf-visual-signature | PDF | Typed, visible signature **not** cryptographic signing |
| pdf-rearrange-pages | PDF | Exact page-order permutation |
| image-metadata-cleaner | Images | Re-encode image pixels without common EXIF metadata |
| passport-photo-maker | Images | Common 35×45 mm and 2×2 inch crops; not guaranteed authority acceptance |
| qr-code-scanner | Creator | Read a QR code from local image pixels |
| invoice-generator | Business | Itemized PDF invoice with taxes, no billing or payments |
| image-ocr | Images | English Tesseract.js WASM OCR |
| pdf-to-text | PDF | PDF.js extraction from selectable text (not OCR) |
| svg-to-png | Images | Sanitized self-contained SVG to PNG |
| barcode-generator | Creator | Code 128, Code 39, EAN-13 SVG barcodes |

## Quality and boundaries

- Staging build validates **107 individual tool pages** and **109 canonical sitemap URLs**. The first 92 tool page sources and existing homepage/Tool Launcher HTML, JavaScript and styling remain unchanged.
- Production and preview build checks passed **142 automated Node tests each, zero failures**; preview artifacts carry noindex and production artifacts do not.
- **15 of 15 interactive standalone tool page checks passed** using synthetic files and downloaded Blob signatures in Cloudflare Chromium (including real English OCR).
- Additional interactive operation tests passed for PDF editing, PDF rendering, image conversion, QR generation/reading, barcode output and OCR.
- Tool Launcher regression passed **40/40 interactions** across 320, 375, 768 and 1280px viewports.
- Self-hosted runtime dependencies: MIT pdf-lib, MIT JsBarcode, Apache PDF.js, Apache jsQR, Apache Tesseract.js, and self-hosted English language data. Pin npm versions in package.json. Re-check each license and transitive dependency on upgrades.
- The app does not upload visitor documents or depend on a commercial inference/conversion API. Heavy engines load only on their dedicated tool pages.
- No existing Headquarters worker, permissions, email DNS, processing API or domain routing is changed by this release.
- PDF compressor **does not guarantee smaller output**; rasterization can remove text, forms, links or signatures; this is explicitly disclosed. Tesseract OCR accuracy and latency vary with image and device. Typed signatures are not digital signatures. Passport photo sizing is not formal eligibility certification.

## Release / rollback

- Staging project: `yorphives-v1-review` using the moving development branch and preview `noindex`.
- Production Pages project: `yorphives-v1-live`. Verify branch and SHA, with automatic deploys disabled. Deploy explicitly from pinned `release/v1.1-rc1` after tests.
- After public deployment verify homepage, `/tools/`, at least five new direct entries (including OCR and PDF conversions), an old tool, legacy alias redirect, the new sitemap, preview/prod robots headers, and disabled Ko-fi.
- Roll back by selecting the previous successful Cloudflare Pages deployment or rebuilding from the pinned `release/v1.0-rc6` branch. Never delete prior release refs or production deployment history.
