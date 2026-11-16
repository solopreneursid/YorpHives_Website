# YorpHives Kinetic — original visual design system

**Status:** New front-end implementation, review only. No production deployment.

## Communication standard

**Founder-led. Intelligence-powered. Ideas in motion.**

The website is operated by YorpHivesHQ and its AI workforce. AI specialists
observe, research, analyze opportunities and recommend. The founder approves,
revises or rejects projects and controls source changes and launches.

The public interface should explain this through diagrams, motion and *short
single-line sentences*. Never copy founder notes directly into public paragraphs.
Keep operational details in internal documentation, not the hero.

Explore contains only founder-approved, publicly launched YorpHives projects.
There must be no fabricated opportunities, future jobs or invented revenue.

## Single canonical frontend

- `index.html`: five semantic pages and native interactive controls.
- `next.css`: **completely replaced** from scratch. Design foundations,
  compact desktop layouts, moving category rail and verified YHpulse.
- `next-responsive.css`: **completely replaced** from scratch. Responsive
  compositions, touch targets, bottom mobile dock and reduced-motion support.
- `next.js`: local routing, independent catalog UI, filtering, favorites,
  pagination, image-free CSS motion controls and founder-controlled contact.
- `tools/index.html` + `tools/directory-next.css`: responsive A–Z catalogue.
- `tools/tool-next.css` and `scripts/next-tool-shell.mjs`: shared appearance
  for every direct tool, **not** a rewrite of its processing code.
- `catalog.json` + `product-policy.mjs`: source-of-truth public tools and
  verified founder-approved product qualification.
- `scripts/activity-feed.mjs`: only source of public YHpulse updates; static
  `renderHomePulse()` emits a single homepage stream with valid published links.

No remote fonts, CDN scripts, proprietary UI kits or paid app dependencies.

## Visual hierarchy

1. Mobile hero: short headline, one-line promise, two small calls to action;
   no foreground dashboard or decorative card. Animate faint intelligence
   signals **behind** the typography with local CSS. Preserve readability.
2. Automatically moving free tool category rail directly below the hero;
   separate manual category **filters** on Free Tools for precise taps.
3. Three equal-purpose entry destinations (Explore, Free Tools, Builders).
4. HQ flow diagram: six specialists, evidence stream, human go/no-go gate.
5. Five-step research→decision→build cards.
6. Product launch gate, small Builders intro and **one** public YHpulse.
7. Explore and Builders repeat the same design language without repeating
   the homepage's entire explanation.

Palette: `#0d1e19` forest, `#b4f5ce` mint, `#f5f7f1` paper,
`#183329` ink, `#dce8dd` borders. Local system sans + Georgia italics.
Mobile gutters: 16–26px; desktop shell up to 1280px.

## Motion standard

- `rail-drift`: moving tool-category chips; built from live catalog groups.
- `pulse-scroll`: one verified public update feed, inserted directly into the
  homepage during static build; **do not duplicate YHpulse in the footer**.
- Individual pause/resume controls for category and YHpulse groups, with
  `aria-pressed` and descriptive accessible names.
- Pause on hover/focus, and disable animation completely for
  `prefers-reduced-motion: reduce` while keeping the first set of links
  navigable. The second visual set is `aria-hidden` and non-focusable.
- Background ornament motion is transform-only and decorative.
- Avoid anything that blocks scrolling, creates horizontal body overflow,
  steals focus or prevents a visitor from interacting with tools.

## Non-negotiable release controls

- Publish only founder-qualified products through `qualifiedProducts`.
- Public Builders has no jobs, posts, prices or checkout until verified
  paid-membership controls genuinely exist.
- Preserve all tool URLs, processors, native form IDs and local processing.
- Keep strict Content Security Policy and noindex previews.
- Preserve reliable production and preview release checks.
- No automatic agents or HQ employees may edit or deploy source code.

## QA minimum

Check 320, 360, 390, 430, 768, 1024, 1440 and 1920px widths; portrait
and landscape where possible; keyboard nav, zoom, no horizontal overflow,
reduced motion, real tool processing and YHpulse integrity.

`review/next-ui-qa.mjs` is an opt-in preview-only browser interaction suite
for routing, search, saved tools, category filtering, pagination, HQ founder
gate, animated category/YHpulse components and pause controls.

The founder reviews the preview separately before any release. This branch
**must not merge into or deploy to yorphives.com automatically**.
