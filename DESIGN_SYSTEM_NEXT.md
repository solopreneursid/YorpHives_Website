# YorpHives — Three-Experience Frontend

**Status:** Draft preview only. Never merge or deploy to yorphives.com without the founder's explicit instruction.

## Visual strategy

**Founder-led. Intelligence-powered. Ideas in motion.**

YorpHives presents itself publicly as an **AI-powered venture studio**.
Its founder-approved project and venture showcase is branded **HQventures**.


YorpHivesHQ operates the website's intelligence workflows. Its evolving AI
workforce researches opportunities and presents evidence. The founder retains
the final decisions about projects, releases, deployments and business direction.

The homepage communicates this **once**, in its brief hero, rather than
repeating the HQ process in several sections.

## Homepage structure

1. **Hero:** Short founder-led message over a native, animated SVG/CSS
   intelligence field using the cyan, turquoise, blue and mint geometry of
   the existing YorpHives brand. No large foreground console, illustration
   card, stock photo, remote graphic or extra paragraph.
2. **HQventures:** Immersive dark project lab with one featured project. Only
   qualified and founder-approved published products are shown. Until then,
   the public stage says explicitly that no project has launched. An abstract
   geometric artifact decorates the empty state; it is not a fake project.
3. **Use:** Bright, interactive workspace with six clickable featured tools
   drawn from the actual public catalogue, a functional homepage search that
   opens matching Free Tools results, and continuously moving categories
   with a pause control. No duplicated mock tools or second search index.
4. **Connect:** Light-mint animated network of people and project nodes.
   Clear, separate destinations for real contact and future paid Builders
   membership. The network visualization is conceptual, not real-time data.
5. **YHpulse:** A single stream of verified recent public activity, injected
   into the static homepage at build time. Never repeat the ticker in footer.

## Partnerships discovery

- Homepage Connect has **three equal entry paths**: Contact, Builders,
  **Partnerships**. Keep these discoverable on phone without adding another
  generic explanatory section.
- The Builders hero has a dedicated **Partnerships** anchor to a separate
  visually prominent section with potential collaboration areas.
- The existing `#partners` hash opens that section directly in Builders;
  `#membership` remains separate.
- Formal Builder partner applications, partner memberships, and entitlement
  decisions are **not open**. Users may ask about partnerships through a
  locally generated email prepared for their review. No application, paid
  transaction, partner acceptance or privileged access is implied.
- Founder review and trust verification remain mandatory; never enable
  automated partner approvals or production changes.


The five distinct navigation destinations are Home, Free Tools, **HQventures**,
Builders and Contact. The existing `#explore` route is retained internally
for backward-compatible bookmarks; every visitor-facing page, navigation
label and direct-tool shell uses HQventures.

## File ownership

- `index.html`: Semantic page structure, new three-section homepage.
- `home-experience.css`: **Sole owner** of homepage experience layouts,
  logo-inspired hero geometry and animation, plus home-only responsive rules.
  Avoid appending overrides to other stylesheets for these components.
- `next.css`: Global design system and shared navigation, tool widgets,
  category marquee, inner pages, Builders, contact, and verified pulse cards.
- `next-responsive.css`: Responsive composition only for global elements
  and inner pages; old homepage rules have been removed.
- `next.js`: Dependency-free local router, live catalog search/categories,
  favorites, approved product list, dynamic homepage featured tools and
  project showcase, accessible pause controls.
- `catalog.json`: Sole source of published free tools and qualified products.
- `product-policy.mjs`: HQ evidence + founder approval required to publish.
- `scripts/activity-feed.mjs`: Only verified public recent changes in YHpulse.
- `scripts/build-site.mjs`: Builds preview and production, copies current
  homepage CSS, injects one YHpulse and performs release checks.
- `tools/tool-next.css`: Shared direct-tool visual shell without changing
  its processor code.

## Principles

- Few words; visual storytelling; no repeated process diagrams or filler.
- Phone-first; distinct backgrounds, useful actions and clear hierarchy.
- Original first-party effects only; SVG and GPU-friendly transforms.
- Honor `prefers-reduced-motion: reduce` across all animations.
- Category and YHpulse marquees have accessible pause/resume controls.
- Real product/tool links, not fabricated examples. No mock launch claims.
- No remote fonts, SaaS, proprietary APIs or third-party assets.
- No HQ/agent permissions for source modifications or production deployment.

## Quality gates

Use tests in `tests/` (all native Node), the build-time release gate,
and opt-in `review/next-ui-qa.mjs` browser acceptance checks. Test 320px,
390px, tablet and desktop; run real tool search, links, favorite controls,
all deep links, motion pause, zoom, reduced-motion and overflow checks.

Only the founder can authorize publishing the preview to the live website.
