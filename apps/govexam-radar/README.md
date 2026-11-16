# GovRadar · HQventures Product 01

GovRadar is a transparent, zero-dependency government recruitment **source directory and research-lead tracker**. Its first version transforms the uploaded GovExam & Job Radar HTML prototype into a deployable Cloudflare Worker.

## Honest scope (v2.2 pilot)

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
- **Official-feed pilot:** one source-specific, daily-to-three-hour rotating adapter for the UK DfE's Teaching Vacancies open-data API. The source returns Schema.org `JobPosting` records; GovRadar only imports records with future `validThrough`, verified official-domain URLs, and required fields. These are **source-confirmed records, not individually verified job notices**.
- **Not implemented**: comprehensive global live vacancy coverage, verified admit-card/result ingestion, delivered email alerts, recoverable cross-device accounts. Do not advertise these as live.

## API

- `GET /openapi.json`: machine-readable OpenAPI 3.1 contract for external tools and agents.
- `GET /api/health`: worker health and version.
- `GET /api/catalog`: official source registry, unverified leads and an empty verified listing dataset.
- `GET /api/check?id=upsc`: on-demand reachability for a registry entry. Public API rejects arbitrary URLs.
- `GET /api/source-status`: persisted reachability status, freshness and last check timestamp for the 17 known source URLs.
- `GET /api/notices`: separate DfE official-feed notice records with server-side pagination, search and inferred job category.
- `GET /api/ingestion-status`: latest source-ingestion outcomes; a failed import never fabricates vacancy data. Read-only inspection only.
- Community API: register / posts / post / reply / vote / report / export / delete-post / delete-account. Posts and replies are held in D1; no third-party account provider.

## Deployment

Entry: `apps/govexam-radar/worker.js`. It exports the standard Fetch API Worker handler and imports seven first-party runtime modules, including compiled CSS. Deploy it as an ES module Worker initially named `hqventures-govexam-parity-preview` (the deploy helper's safe default). Override `GOVRADAR_WORKER_NAME` only after review;  Cloudflare D1 binding `DB` is required for community posts, replies and votes. No paid subscription, third-party runtime CDN or AI secrets are needed within Free plan limits. This can be done using Cloudflare's Workers API multipart-module upload, the Cloudflare dashboard or the self-contained `deploy.mjs` Node helper in this folder. Never place deployment tokens in GitHub code or user-facing pages. For an ongoing CI deployment, configure protected GitHub secrets.

To deploy from a local clone with Node.js 22+, set `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` in the **local environment** and run `node apps/govexam-radar/deploy.mjs`. Keep write permissions scoped to this Worker.

## Testing

```bash
node --test apps/govexam-radar/worker.test.mjs apps/govexam-radar/source-monitor.test.mjs apps/govexam-radar/official-feed.test.mjs
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

## Official-feed pilot: UK Department for Education (DfE)

- Official source: https://teaching-vacancies.service.gov.uk/api/v1/jobs.json (the public JSON read endpoint). This is **not** the DfE's authenticated ATS/publisher API. Live compatibility confirmed on 16 November 2026 via a one-shot HTTP 200 read; response includes `data` (Schema.org JobPosting) and `meta.totalPages`.
- Licence/terms: https://teaching-vacancies.service.gov.uk/pages/terms-and-conditions and Open Government Licence v3. Listings may be reused, but no fee or commission may be charged for contacting, interviewing or hiring a respondent. Include attribution and a link to the original posting.
- Each scheduled read requests only **one page** (up to 100 records) and rotates a persisted page cursor. This is a **limited sample**, not complete or instantaneous collection of all DfE vacancies.
- Mandatory provenance: HTTPS URL on the exact `teaching-vacancies.service.gov.uk` host under `/jobs/`, title, employer, future closing timestamp, source ID, first/last seen, and a SHA-256 field summary. The feed is never used to infer foreign citizenship eligibility.
- Store in `official_job_notices`, audit in `source_ingest_runs`, and page cursor in `source_feed_cursors`; all described in the portable SQLite migration `official-notices.sql`. The deployed staging Cloudflare D1 already has the migration applied.
- Cron `20 */3 * * *` runs the official job adapter; existing `0 */3 * * *` remains exclusively for portal website reachability. D1 read endpoints do not trigger upstream requests; visitors cannot force scraping.
- The implementation fails closed on wrong schema, non-JSON, unexpected redirect, source restriction, excessive response size, wrong domain, stale closing timestamp, or database error; prior records are not silently deleted.
- Do **not** refer to source-confirmed imported notices as individually verified, automatically checked for right-to-work, or proof that the job is still open. All hiring conditions must be checked on the original posting.
- The data feed does not cover UPSC, SSC, RRB, JPSC or other Indian exam notifications. Those remain directory links and historical sample leads until suitable legal, authentic public sources are integrated separately.

### Pilot verification — 16 November 2026

- The UK DfE official JSON feed returned HTTP 200 with a Schema.org `JobPosting` `data` array, 100 items and 62 pages. All 100 records in the first page passed strict validation in a GitHub Actions read-only probe.
- A one-time, audited, source-provenance preserving bootstrap placed 100 official-feed records into the isolated Cloudflare D1 database. The browser and HTTP integration checks confirmed imported records can be read and bookmarked.
- Current draft PR CI passed at 320, 375, 768, 1440px and on live preview mobile. These records remain **source-confirmed, not independently verified**, and the pilot is not yet exhaustive.
- The bootstrap was a single operation. It does **not** prove the future Cron Trigger can fetch this source from Cloudflare; observe and independently verify the first scheduled ingestion outcome. Until then do not claim unattended recruitment synchronization is operational.
- The experimental minute-frequency schedule was removed. Only conservative 3-hour recurring checks remain enabled on the separate staging Worker. No production website files were changed.
