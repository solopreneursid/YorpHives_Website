# YorpHives public tools — discovery, retention and responsible revenue gates
Updated: 2026-11-18. Scope: public YorpHives website; HQ is not a dependency.

## Architecture boundary
- Free tool bundles and machine-readable documentation are served as static first-party assets from the edge, while sensitive file processing remains in the browser wherever currently supported.
- The public agent registry lists **five** explicitly permitted stateless JSON operations. Never advertise the other 138 tools as remotely invocable.
- Maintain direct canonical URLs, static category links, JSON-LD, Markdown companions, sitemap and the catalog. A browser interface or discovery page must never imply an approved launch or payment flow that is not actually live.
- HQ has no rights to mutate website, worker configuration, public tool catalog, payments or data.

## Product discovery and return visits
- The A–Z directory remains crawlable without JavaScript. Client-side search and the saved-only view are optional enhancements.
- Saved tools use the same local-storage key as the homepage, `yorphives-studio-saved-v1`. This stores only validated tool URL paths; **not documents, input text, calculation results or personal identifiers**.
- On individual tools, local-only Save/Remove and same-category static recommendations use founder-approved catalog entries. No recommendation service, account or paid API is required.
- If storage is denied or disabled, the interface must explain that saving is unavailable. Never show false persistence.
- Deep links `/tools/?q=pdf` and `/tools/?saved=1` work without server state. The saved-only filter only reveals links locally saved in that browser and device.

## Responsible monetization: prohibited until gates pass
1. **Ads:** Do not inject ad networks, banners, tracking scripts or sponsored results into a PDF editor, image processor or sensitive workspace. If advertising is approved later, prefer clearly labeled non-obstructive inventory around the directory/content pages, never disguised as a tool or search result. Respect consent requirements and user choices. Ad earnings are not assumed.
2. **Guest/sponsored posts:** No undisclosed paid links, unreviewed submissions or SEO-link schemes. Require human editorial checks, publication policy, factual review and prominent sponsored labeling; use appropriate `rel="sponsored"` for paid outbound links.
3. **Donations, membership and checkout:** Keep disabled until a founder-approved destination, refund/support policy, tax/legal review and independent access controls exist. Never suggest that the existing Ko-fi placeholder is a working payment system.
4. **Agentic commerce:** Public stateless tools remain free. Do not accept payment credentials or grant agents privileged posting, purchases, deployment or storage without a separate identity, consent, authorization, fraud and billing design.
5. **Revenue reporting:** Distinguish actual verified settlement/transactions from traffic, estimated usage, inferred demand or projected revenue. Do not fabricate conversion metrics.

## Release acceptance
- Build production and preview independently; preview must have noindex, production must not.
- Unit tests confirm all 143 tool pages exist, no unlisted related links appear, and every canonical tool remains crawlable without JS.
- Test mobile search, saved view, browser storage denied, keyboard focus, and at least one PDF/browser-local tool flow in browser QA.
- Verify live Worker route and separately test Pages rollback. Do not merge/auto-deploy while the release remains a draft.
- Monitor first-party events only as already covered by the privacy model; search terms, saved lists and file contents must never become analytics payloads.

## Next validation questions
- Which categories bring visitors back without collecting search inputs?
- Which tools are used successfully (rather than merely clicked)?
- Which revenue channels are permissible and suitable for the audience after founder review?
- Can the production site withstand a rollback and an isolated restore without involving HQ?
