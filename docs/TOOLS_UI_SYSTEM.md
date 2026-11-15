# YorpHives Free Tools — Shared UI System (v1.2)

Release branch: `release/v1.2-tools-ui-rc1`  
Base production commit: `5700d7691564786a37bec87e26e6a6e54ba71a53`  
First verified in Pages Preview: `db775cf7.yorphives-v1-review.pages.dev`

## Coverage

- **106 of the 107** existing tool pages receive the reusable, versioned `/tools/tool-suite-v1.css` and `/tools/tool-suite-v1.mjs` assets in the output build.
- **PDF Compressor** retains its separately validated `compressor-ui-v3.css` interface, with no double styles or conflicting scripts.
- Categories: Writing, Developer, Calculators, Design, Security, Marketing, Creator, PDF, Images, Spreadsheets, Presentations, Files, Business.
- All future public tools in `catalog.json` automatically receive this style layer through `scripts/build-site.mjs` unless they use the dedicated compressor page.
- Original frontend homepage HTML, homepage JS/CSS, individual tool source HTML, tool processing modules, Headquarters and permissions are unchanged.

## Reusable interface patterns

1. **Editor / text tools:** Guided input header, polished text editor, logical options, clearly delineated result card, copy action, privacy-aware status.
2. **Calculator / business tools:** Grouped numeric and text fields, responsive grids, clear primary actions, readable results.
3. **File / PDF / image tools:** Accessible upload/drop zone, selected-file preview, settings separated from upload, responsive and scroll-safe file lists, protected download result.
4. **Special tools:** Existing JSON editor layout, interactive image resizer and code-generator previews continue to use their proven processing event handlers.
5. **Design standards:** WCAG-oriented keyboard focus, visible selected/disabled/error state, reduced-motion rules, small screens including 320px, consistent colors/type/spacing, no externally hosted runtime dependencies.

The original `<input>` elements and event handlers are preserved. The optional JavaScript enhancer adds presentation and drag/drop behavior; native file selection remains available even without enhancements.

## Browser QA and release gate

- Static audit: all 106 intended pages carry the new assets **once each**; PDF Compressor is excluded correctly; each page retains its canonical, sitemap entry and existing page structure.
- Node tests: **152 passing, 0 failing** in the production and preview builds.
- Actual computed-style and geometry tests: desktop 1280px and narrow mobile 375/320px on representative Writing, Developer, Calculator, Security, Marketing, Design, Image, File, PDF, Spreadsheet and Presentations tools.
- Actual interactive workflows: word counting, loan calculation, SHA-256 file output, merging PDF files with validated page count, generating invoice PDF, rendering PDF pages as images, JSON formatting and local image resizing.
- Real staging screenshots inspected for text editing, PDF file upload, invoice layout and image resizing. Visual checks are mandatory; passing source tests alone is insufficient.
- Preview-only QA assets: `review/tool-suite-qa.mjs` and `review/tool-suite-flow-qa.mjs`. Never ship them on production.
- The static build adds contextual help steps but does not change processing algorithms or file privacy.

## Deployment and rollback

1. Verify `yorphives-v1-live` is still serving production SHA `5700d769...` with automatic deployments **disabled** before changing its release branch.
2. Publish the frozen tested commit from this branch **manually**, keeping the previous Cloudflare deployment intact.
3. Run post-deployment browser checks on the real custom domain: homepage; Tool Launcher; PDF Compressor; a text utility; an image tool; PDF merge; invoice; JSON; and 320px mobile layout. Verify direct links, sitemap and preview/production indexability.
4. If a regression is found, roll back to the prior production deployment and inspect the corresponding UI component. Do not delete release tags or QA evidence.

## Extension policy

Future tool launches must include a real rendered desktop/mobile check and a real output test for the tool's workflow. Avoid publishing a tool that merely passes code-level tests but renders with missing CSS or colliding controls. Place category-specific exceptions in versioned, first-party components instead of duplicating one-off tool CSS across many pages.
