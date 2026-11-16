# GovRadar · HQventures Product 01

GovRadar is a transparent, zero-dependency government recruitment **source directory and research-lead tracker**. Its first version transforms the uploaded GovExam & Job Radar HTML prototype into a deployable Cloudflare Worker.

## Honest scope (v2.0)

- Full six-section founder-uploaded interface with advanced location / country / citizenship / stream / stage filters, imported example records, archived data, demo lifecycle, custom personal leads, email preference settings, and 4-part guide.
- 17 government-related official portals across 10 geographic categories.
- 10 imported prototype opportunity *research leads*, explicitly **unverified** and not represented as live vacancies.
- Country / keyword / technical-stream filtering, browser-local bookmarks and responsive mobile-first interface.
- On-demand and scheduled official **site reachability** checker restricted to a fixed allowlist. Reachability **does not** verify recruitment details.
- Installable simplified PWA shell under `/lite`, and full responsive six-tab version under `/`.
- Real shared community discussions, replies, and votes using a separate free-tier Cloudflare D1 database. Device-bound identity tokens prevent username-only impersonation; losing local browser storage loses your handle.
- Community now includes report buttons, personal export, post deletion and account deletion. Reports enter an unreviewed D1 queue; **public community launch still needs human moderation operations, privacy review and abuse-volume monitoring**.
- Self-hosted compiled Tailwind CSS 3.4.17, with source generator and portable CSS. Zero third-party browser runtime fetches.
- OpenAPI 3.1 contract at `/openapi.json` plus JSON catalog and health endpoints, strict Content Security Policy, no third-party client scripts, and no backend collection of candidate information.
- **Not implemented**: verified job ingestion, automatic background data updates, delivered email alerts, recoverable cross-device accounts. Do not advertise these as live.

## API

- `GET /openapi.json`: machine-readable OpenAPI 3.1 contract for external tools and agents.
- `GET /api/health`: worker health and version.
- `GET /api/catalog`: official source registry, unverified leads and an empty verified listing dataset.
- `GET /api/check?id=upsc`: on-demand reachability for a registry entry. Public API rejects arbitrary URLs.
- `GET /api/source-status`: persisted reachability status, freshness and last check timestamp for the 17 known source URLs.
- Community API: register / posts / post / reply / vote / report / export / delete-post / delete-account. Posts and replies are held in D1; no third-party account provider.

## Deployment

Entry: `apps/govexam-radar/worker.js`. It exports the standard Fetch API Worker handler and imports five first-party runtime modules, including compiled CSS. Deploy it as an ES module Worker initially named `hqventures-govexam-parity-preview` (the deploy helper's safe default). Override `GOVRADAR_WORKER_NAME` only after review;  Cloudflare D1 binding `DB` is required for community posts, replies and votes. No paid subscription, third-party runtime CDN or AI secrets are needed within Free plan limits. This can be done using Cloudflare's Workers API multipart-module upload, the Cloudflare dashboard or the self-contained `deploy.mjs` Node helper in this folder. Never place deployment tokens in GitHub code or user-facing pages. For an ongoing CI deployment, configure protected GitHub secrets.

To deploy from a local clone with Node.js 22+, set `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` in the **local environment** and run `node apps/govexam-radar/deploy.mjs`. Keep write permissions scoped to this Worker.

## Testing

```bash
node --test apps/govexam-radar/worker.test.mjs
```

GitHub Actions executes these tests on changes to this product. Smoke-test the independent Cloudflare URL before merging the PR or linking the product from the YorpHives site.

## Growing toward a full live employment product

1. Add source-specific connectors only for public feeds/APIs or permitted scraping and comply with terms and rate limits.
2. Store each notice with official document URL, source snapshot/hash, published/check times, closing date and a manual/automated verification state.
3. Quarantine uncertain notices; never infer open status from a portal being reachable. Re-verify expiry and eligibility against **each specific posting**.
4. Add audited storage (portable SQLite schema; Cloudflare D1 may be an optional managed adapter), scheduled ingestion and a founder/reviewer queue.
5. Implement genuine opt-in email or push only when a compliant sending channel exists within budget; no fake dispatch log or unverified claimed alerts.
6. Add authenticated, moderated community only after secure identities, rate limits and abuse handling exist.

## Cost and ownership

The Worker Free plan has request and CPU caps; zero cost applies **within free-tier quotas**. To support large-scale static traffic, move CSS/HTML/JS to Workers Static Assets while retaining optional API functionality. Source, UI, catalog and logic can be moved to another standards-compatible host; there is no paid AI or closed API dependency.

© HQventures. Independent product; not affiliated with government recruiting organizations. Repo license applies.

### Deployment DB binding

`DB` → `b1f499a6-283b-47e8-8cd7-ef2b5f7245bc` in account `69234e51e08d8013980a7ff869746609`. D1 schema: `members`, `posts`, `replies`, `votes` plus indexes. Source domain, account and DB identifiers are not secrets; API credentials must never enter source code. The staging Worker is `hqventures-govexam-parity-preview` and the established independent GovRadar Worker is `hqventures-govexam-radar`.

## Scheduled monitoring (verified source availability only)

- The **staging** Worker has Cloudflare Cron Trigger `0 */3 * * *` (UTC): 3 of 17 portal URLs each run, prioritizing the least recently checked. The whole directory is normally checked within a day.
- No browser session or AI model needs to stay online. The D1 tables `portal_status` and `portal_history` hold 30-day reachability history. See `portal-status.sql` for a portable SQLite schema.
- A successful HTTP response, including redirect, means the **site responded**. It is never evidence that a vacancy exists or that a listed examination is current. Some government sites reject automated checks; those are explicitly flagged as restricted or unconfirmed.
- Free-tier quotas, external website policies and rate limits remain binding. Monitoring cadence may be reduced if required. Do not add large-scale scraping without source permissions.

## Community safety and ownership

- Every community participant uses a browser-bound random credential; user handles alone cannot authenticate. No email address is required for discussion.
- A member may report any other member's post or reply; `reports` is a *review queue*, not a claim of automatic moderation. The founder must review reports before broad public launch.
- Members can download their own post/reply data, delete their own thread (including its replies), or permanently delete their community account. This removes their own content and any replies by others under their threads.
- No public administrative mutation endpoint exists. Staff moderation/abuse policy, resilience and privacy review remain launch blockers.
