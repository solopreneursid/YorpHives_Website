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