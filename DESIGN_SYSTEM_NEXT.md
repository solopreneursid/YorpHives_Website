# YorpHives Next — Front-end design system

**Status:** Preview-only redesign. Not merged into the production branch.

## Architecture

This is a new first-party website interface, not a series of overrides to the
previous homepage. Keep page structure, styles, and functionality independent
of third-party SaaS and external fonts.

| Layer | Purpose |
| --- | --- |
| `index.html` | New semantic content architecture: Home, Free Tools, Explore, Builders, Contact |
| `next.css` | Canonical typography, colors, spacing, components, desktop composition |
| `next-responsive.css` | Tablet and phone layouts, safe-area and reduced-motion support |
| `next.js` | Hash routing, navigation, search, categories, local favorites, form |
| `catalog.json` | Public first-party inventory for tools and qualified products |
| `tools/index.html` and `tools/directory-next.css` | A–Z category directory |
| `tools/tool-next.css` | Shared direct-tool workspaces and navigation |
| `scripts/next-tool-shell.mjs` | Build-time shell for **all** public tools; no processor modification |
| `product-policy.mjs` | Existing qualification and founder approval policy; retained |
| `scripts/build-site.mjs` | Static generation, security, metadata, and previews |

## Visual foundations

- Colors: forest `#10201e`, mint `#baf7d3`, paper `#f4f6f0`,
  ink `#14241e`, muted `#667c6e`, divider `#dbe5db`.
- Fonts: system sans + built-in Georgia italic emphasis. No remote font requests.
- Surfaces: calm solid colors, strong contrast, 11–23 px radii, light borders.
- Page gutter: fluid shell on desktop; 16–26 px on phones.
- Mobile navigation: five equally sized destinations with safe-area padding.
- Primary actions: touch-friendly, consistent, visible without hover.
- Search: first-class action on Free Tools; category pills scroll on small phones.
- Hero graphics: original CSS/SVG decoration, not stock art, and never essential
  to understanding the page.

## Rules for future development

1. **Do not return to patch layering.** Change the canonical component in
   `next.css`, then its corresponding responsive composition in
   `next-responsive.css`. Delete obsolete rules when replacing a component.
2. A tool is added to `catalog.json`, not hand-coded into the directory. Every
   tool retains a direct URL, accessible form and local processor.
3. The tool UI adapter may change navigation, spacing and visual components,
   **never processor form IDs, output IDs, security constraints or file data**.
4. Unqualified products are **never** promoted to a public launch. Membership
   pricing, paid jobs and partner access remain unavailable until implemented.
5. Keep all CSS and JS static and first-party. No proprietary services or paid
   execution dependencies.
6. Test at 320, 360, 390, 430, 768, 1024, 1440 and 1920 px. Check keyboard
   focus, scroll/overflow, zoom, reduced-motion and the real tool output.
7. Keep preview deployments **noindex** and unmerged; require founder review
   before any change to the live website.

## Verification

The Cloudflare Pages review project runs the existing production and preview
builds, Node unit tests, dependency checks and release validation. Additional
regressions:

- `tests/next-tool-shell.test.mjs` verifies all direct tool pages preserve
  original forms and gain the shared responsive shell.
- `review/next-ui-qa.mjs` is an opt-in, preview-only browser interaction test
  for routing, search, filters, favorites, pagination and overflow.
- `review/next-word-tool-qa.mjs` is opt-in, preview-only actual Word Counter QA.
- `review/browser-interaction.mjs` also tests PDF Merge using real in-browser
  file processing and downloadable output.
- Page-specific security, catalog, sitemap, SEO, and product qualification
  tests remain active.

**Release boundary:** The redesign branch is for review only. Publishing to
`yorphives.com` requires a separate explicit founder decision.
