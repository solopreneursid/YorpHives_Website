# YorpHives — full experience reimagined

This is a **new website interface written from scratch**, not a patch to the old homepage. It has independent HTML, CSS, and client-side behavior. It reuses only the existing **genuine** logo, published utility catalog, working tool URLs/engines, and shared founder-approval policy. No proprietary UI kits, remote assets, third-party analytics, cookies, accounts, or paid dependencies.

## Accessible preview URL

Cloudflare Pages **review only**: `/reimagined/#home` (all sections have internal links: `#ventures`, `#builders`, `#impact`, `#tools`, `#partners`, `#contact`). The parent homepage and live website are not modified by this preview-only build.

## Business architecture

- **HQventures** is the flagship. Products are displayed only if the canonical `product-policy.mjs` qualification gate approves them, including required HQ evidence and founder approval.
- **Builders** is the professional network in development. Honest upcoming states; no simulated job postings, public applications, payments, or unapproved membership claims.
- **Impact** is the public evidence surface: verified utility/venture counts are derived from `catalog.json`; other aggregates remain private or absent unless `impact-public.json` receives a founder-reviewed and independently verified approved snapshot. Graph displays direction signs only and deliberately lacks actual amounts, percentages, ratios, conversions, or transaction data.
- **Free Tools** provides working search, categories, sorting, pagination, and local-only saved items for the original 143 publicly listed utility pages, without modifying those tools.
- **Partners/Contact** use a distinct collaboration experience. Contact currently prepares a `mailto:` message for the visitor to review; the page never falsely claims to accept or submit data directly.
- **YorpHivesHQ** only researches, monitors, evaluates, and recommends. The founder controls approval, publishing, product launches, and deployments.

## Verification and future work

The standalone experience is statically served with a preview-only noindex marker and Pages preview X-Robots-Tag. It must be tested on mobile and desktop, including navigation, filters, actual links, keyboard, local storage, reduced-motion, empty states, and data-gating. No user/partner/revenue analytics collector is installed yet. Integration must use an independent first-party, provider-neutral contract, source attribution, privacy aggregation, reasonable retention, publication review, and a server-side authorization gate. A JSON field saying `approvedByFounder` is **not** a signature or an authentication mechanism and must never be treated as one by an automated publishing process.

This preview is deliberately outside the live site's root and **excluded completely from production builds**. Promote only after founder review and a separate release plan.

## Evidence-backed auto-rotating discovery strips

Four compact strips keep the visual hierarchy of the approved reimagined design:

- **HQventures:** One founder-approved, launched product at a time, using the same qualification policy as the rest of the site. When there are no approved launches, the card says so and does **not** rotate fictional names.
- **Free Tools:** One genuine `catalog.json` category at a time, ordered by number of published tools. Clicking a highlighted category opens the working library with that category selected.
- **Builders:** Up to ten newest verified builder updates, one at a time. The build produces `reimagined/builders-updates.json` independently from actual reviewed `public-activity.json` and public-page evidence, so it is not crowded out by regular tool updates. Only one builder update is presently supported; it stays static until more verified updates are published.
- **YHpulse:** A single strip immediately before the footer on all seven views, allowing up to ten actual most-used apps/tools/products. `usage-public.json` starts **unpublished** with no rankings. A founder-approved aggregate with `publication.status=approved`, `approvedByFounder=true`, `approvedAt` ISO day, `periodDays=30`, `metric=completed_uses`, and `ranked` entries `{url: 'tools/slug/'}` may be released only after independent first-party analytics validation. Every ranked URL is checked against the published utility catalog or qualified ventures, deduplicated and capped at ten. No counts or private analytics are published. An empty state is shown until verified data exists.

Rotation changes a single line at a time without expensive CSS marquees or backend polling. Pausable, stopped while hidden/offscreen/hovered/focused, respects `prefers-reduced-motion`, never auto-announces to screen readers, and preserves real category and product links. Only preview builds include this experience; production is unchanged. **A JSON approval flag is an output gate, not an authentication mechanism or proof of founder authorization**—the publishing process must be separately controlled and audited.