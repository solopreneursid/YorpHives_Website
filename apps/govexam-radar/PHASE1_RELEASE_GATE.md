# GovRadar Phase 1 — official source ingestion release gates
Updated: 2026-11-16. Working branch: `feat/govradar-phase1-sources-20261116`.
This checklist is intentionally evidence-based. **Do not mark automatic synchronization successful just because the Worker is deployed or a one-time import worked.**

## Completed in code
- DfE and Manitoba sources: strict HTTPS same-origin redirect checks, bounded retries for transient network failures, limited response sizes and per-run audited outcomes.
- India Employment News **adapter pilot**: source-specific parser and unit tests for government-published factual recruitment index summaries. Requires an explicit closing date and rejects expired, impossible, duplicated, or malformed rows.
- Source-specific country filtering, India summary labelling, browser UI, additive SQLite/D1 source records, no subscription or proprietary runtime.
- Existing Source D1 records and production yorphives.com are not modified by this source branch except that its isolated GovRadar staging Worker is updated for verification.
- GitHub Actions CI covers tests, responsive-browser flows and read-only source reachability.

## Verified staging integration — 2026-11-16 (UTC)
- Cloudflare Worker staging binding `INGEST_HMAC_KEY` was initially accidentally created as `plain_text`; converted to encrypted `secret_text` using Worker settings API, without changing its value or exposing it in logs. Confirmed `DB` D1 binding retained and plain-text binding removed.
- **12:20 UTC**: independent Cloudflare Cron successfully fetched and imported UK Department for Education page 2; D1 `source_ingest_runs` shows `state=ok`, `accepted=100`, `origin=scheduled`, and DfE cursor advanced to page 3. This follows an earlier 09:20 UTC network error.
- **12:22 UTC**: isolated GitHub Actions push run [43865983091](https://github.com/solopreneursid/YorpHives_Website/actions/runs/43865983091) completed successfully. Both live-source read-only probes and offline collector/security tests passed.
- The same run authenticated through the GitHub `GOVRADAR_COLLECTOR_KEY` and Cloudflare `INGEST_HMAC_KEY` HMAC bridge and signed-published Manitoba RSS. D1 audit `9a553c86-6eb8-4432-a1aa-525ee28279cd` shows `state=ok`, `accepted=15`, and `origin=signed_portable_collector`. The RSS had 56 items, 53 eligible; 15 was the bounded incremental batch, **not 15 new distinct notices**. UK was intentionally skipped by the signed collector because its Cloudflare scheduled run had just succeeded.
- After both imports, D1 contains **185 distinct UK DfE notices and 53 distinct Manitoba notices**, total **238** (source-observed, not individually verified or endorsed). No India data ingested.
- The **one-time trusted-branch push verification** and signed publish step were removed immediately. `.github/workflows/govradar-portable-collector.yml` was restored to its original blob SHA `539a5d6f51893356f655d4ada298eb28f66191d9`. Normal pull request tests remain read-only; the portable automatic fallback will not run on a timer until a reviewed release places the workflow on the default branch.
- **Remaining proof needed:** repeated successful scheduled ingestion/healthy operation of both sources over time, real scheduled fallback following reviewed release, free-tier usage, independent recoverability and source-policy review. **Do not confuse one signed test with proven recurring operation.**

## Reliability follow-up — 2026-11-16, 12:40 UTC

- **Both native Cloudflare Cron imports have now succeeded unattended**. UK DfE: 12:20:37 UTC, page 2, `accepted=100`, cursor advanced to page 3; Manitoba: 12:40:29 UTC, valid 56 RSS items with 53 eligible, incremental `accepted=15`, cursor advanced from offset 30 to 46. The native Manitoba audit ID is `7de74142-a160-42b9-9903-c5a166b94906`; `details.origin=scheduled`.
- **Do not conflate one-off signed collector tests with native schedules**. `serveIngestionStatus` now separates `lastSuccessfulScheduledAt` (`origin=scheduled`) from `lastSuccessfulSignedAt` (`origin=signed_portable_collector`). `automation.healthy` requires recent **native Cron** success from *both* sources. User-facing sync status has been corrected accordingly; regression tests added.
- **Encrypted secret preservation on staging deployment**: `deploy.mjs` now requires the precise staging account, Worker name, D1 identifier and encrypted secret registry; refuses plaintext/missing secret or unexpected bindings; submits `{type:'inherit',name:'INGEST_HMAC_KEY'}` with `?bindings_inherit=strict`; and checks bindings again after upload. `deploy-guard.mjs` is dependency-free and has rejection/positive unit tests.
- The actual isolated staging Worker was uploaded with all 17 JavaScript modules and strict binding inheritance. Post-upload Cloudflare settings confirm encrypted `INGEST_HMAC_KEY` and original D1 binding are intact; no other Worker or website was redeployed.
- Independent browser/API and live official-source checks passed on the feature branch. The updated CI smoke now requires both native Cron evidence and the separately labelled successful signed transfer from the staging status endpoint; **do not mistake a passing CI for days of sustained reliability**.
- D1 production storage backend and Time Travel bookmark availability were verified. Its database size at the check was **466,944 bytes** across 12 tables. Cloudflare's Workers Free D1 Time Travel retention is 7 days. No destructive restore was attempted (the database also contains community data).
- **Free-tier reference**, subject to shared-account consumption: Cloudflare Workers Free allows 100,000 requests/day and 5 Cron triggers/account; D1 Free allows 5 million rows read/day, 100,000 rows written/day, 500 MB per database, 5 GB aggregate storage, and 7 days Time Travel. Only 3 Cron schedules are attached to this Worker. *Live full-account daily usage is not independently verified*; continue checking dashboard metrics before claiming an unconditional $0 production guarantee.
- Staging catalogue remains **185 distinct UK + 53 distinct Manitoba = 238 source-observed notices**. Incremental batches revalidate records, so `accepted` is **not a count of new distinct notices**. India remains unimported, pending legal review.

**Still to prove before unattended release:** repeated healthy Cron runs across time, complete free-account utilization review, controlled recovery drill on an isolated copy (never restore this shared database as a test), review of public-source licensing, and a separate founder-authorized default-branch release if the GitHub scheduled fallback is to be activated. **PR #7 stays draft and neither `main` nor `yorphives.com` has been changed.**

## Atomic signed-request replay defense — 2026-11-16, 12:51 UTC

- The original signed-ingest handler checked for an existing UUID and then wrote notices, leaving a small race in which concurrent identical requests could both pass the read. It now **atomically reserves** the authenticated request UUID with `INSERT ... ON CONFLICT(id) DO NOTHING` in D1 **before any notice writes**. The reservation is a visibly pending/error audit receipt (using an allowed existing CHECK state), so a crash does not fabricate a successful import.
- UK DfE and Manitoba ingesters can finalize **only their own pending reserved audit ID** via a conditional conflict update. A successful signed response is denied if final audit writing fails. New automated tests validate same-ID concurrent requests (exactly one can import) and forced audit failures (must not return success).
- The 17-module staging Worker was securely redeployed using strict encrypted-secret inheritance; D1 and `INGEST_HMAC_KEY` survived unchanged.
- A one-time authenticated GitHub Actions [run 43870350599](https://github.com/solopreneursid/YorpHives_Website/actions/runs/43870350599) **passed** live staging integration after this code deployment. Signed Manitoba request audit `54a3aea3-2746-4340-a9af-ea63234de1ce` has `state=ok`, `accepted=8`, `origin=signed_portable_collector` and cursor wrap to page 1. The test deliberately bypassed only the **client's** 2-hour freshness skip using an injected test clock; it did not alter the database's freshness timestamp or any shared secret.
- The one-time trusted-branch trigger was removed immediately afterwards; the scheduled collector workflow blob SHA was restored **exactly** to `539a5d6f51893356f655d4ada298eb28f66191d9`.
- **Limit of evidence:** one successful signed D1 reservation and audit finalization are verified live; simulated concurrent request blocking and audit failure are covered by unit tests, **not** deliberate live races. Native UK/Manitoba Cron success evidence remains separate, as recorded above.

## Earlier external evidence (historical)
- Cloudflare Worker Cron schedules are active at `0 */3 * * *` (site checks), `20 */3 * * *` (UK DfE) and `40 */3 * * *` (Manitoba).
- DfE scheduled attempt at 2026-11-16 09:20 UTC failed with `network_error` before new recovery was deployed.
- Manitoba scheduled attempt at 2026-11-16 09:40 UTC also failed with `network_error`, while GitHub Actions successfully fetched its official RSS (HTTP 200, 56 items, 53 eligible).
- GitHub Actions read-only India probe fetched Employment News official site (HTTP 200, 16 HTML table rows, 2 eligible future-closing summaries on that snapshot); `robots.txt` responded 404. **404 is not a grant of redistribution rights.**
- Earlier one-time import baseline was 100 UK DfE and 53 Manitoba records. **Superseded by the verified 238-record staging snapshot above.**

## Release BLOCKERS
1. **Recurring fetch proof (initial unattended proof satisfied)**: Both UK and Manitoba native Cloudflare Cron have recorded genuine successes. Sustained repeated success and long-term freshness have **not** yet been established.
2. **India reuse policy**: Employment News editorial guidance requires prior permission for reproduction of its published articles. This index parser only extracts minimal factual summaries, but no legal reuse permission for a commercial copy/aggregation has been established. Keep the India Cron trigger **UNCONFIGURED**, do not bootstrap its rows, and do not market India live aggregation until permission is verified or replace the source with a clearly reusable official feed. Its source link and read-only probe can remain.
3. **Source-specific accuracy review**: every source must preserve the official URL, date, employer, jurisdiction, source attribution and proof. Unverified summaries cannot be labelled directly-verified vacancies or official application links.
4. **Zero-cost quotas and no regressions**: confirm Cron/D1/Worker daily consumption stays within free tiers; ensure all existing YorpHives pages unchanged. Main branch and production deployment must remain untouched.
5. **Fallback automated release**: Portable signed GitHub/Node fallback has now passed a genuine authenticated staging ingestion. It is **not automatically scheduled on the default branch** while PR #7 remains in draft. Confirm reviewed release and recurring scheduling, and preserve encrypted Worker secrets on future deployments.

## Portable fallback (implemented; one-shot authenticated test passed; schedule still inactive)
- Code: `collector-client.mjs` (Node.js 22, no third-party runtime packages), `collector-bridge.mjs` (WebCrypto HMAC verification, source allowlist, bounded body, replay audit), `.github/workflows/govradar-portable-collector.yml` (GitHub Actions dry-run and default-branch-only scheduled fallback).
- `GET /api/collector/plan` reports cursor and last successful import for the two approved sources. This does NOT reveal any candidate data.
- `POST /api/collector/ingest` accepts ONLY timestamped, HMAC-SHA256 signed snapshots for UK DfE or Manitoba. It validates the original official-source record schema using the same adapter used by Cron and refuses India or any unlisted source.
- No token, password, candidate profile or session is exposed in public artifacts. The endpoint returns HTTP 503 and performs no writes when `INGEST_HMAC_KEY` is not installed.
- A 5-minute signature window and unique request IDs guard against accidental replay. Page cursor disagreement is rejected; sources remain distinct.
- Source-hosted content is validated but the bridge cannot independently prove that a signed publisher downloaded it from the claimed site; restrict the key to the protected first-party collector, audit all writes, and revoke it if compromised.
- GitHub Actions scheduled workflows require the file to exist on the **default branch**; until this reviewed phase is merged and configured, the fallback is a tested design, not a running automatic recovery.
- To activate: the founder must create a securely generated 32+ character key, install exactly the same value as **Cloudflare Worker secret `INGEST_HMAC_KEY`** on the isolated Worker and **GitHub Actions repository secret `GOVRADAR_COLLECTOR_KEY`**, then review the collector workflow before enabling its schedule. Never put the key in source, PR comments, screenshots, issue discussions, or site HTML.
- A read-only dry-run needs no credentials: `node apps/govexam-radar/collector-client.mjs --dry-run` on a Node 22 machine with Internet access.
- To publish from owner-operated Node 22 after secrets are installed: set `GOVRADAR_COLLECTOR_KEY` and `GOVRADAR_COLLECTOR_TARGET` as environment variables, then execute `node apps/govexam-radar/collector-client.mjs`.
- The GitHub fallback runs at `55 */3 * * *` UTC and skips sources with successful imports less than two hours old, reducing duplicate writes and free-tier usage. GitHub schedules are not exact-time guarantees. A genuine signed import succeeded 2026-11-16; it must **not** be described as a live scheduled fallback until the reviewed workflow is active on the default branch and an unattended scheduled run is audited.

## Next steps
- Re-test isolated Cloudflare preview after deploy; inspect API metadata and mobile browser UI.
- Observe the next scheduled UK/Manitoba ingestions through D1 and confirm *both* sources keep advancing; one verified success does not establish long-term reliability.
- The owner-controlled Node collector fallback is implemented and passed a real signed test. Before enabling unattended sync, review safe release to the default branch and verify scheduled import over time.
- Expand independently verified India/state feeds only after source terms, format and direct notice evidence are established.
- Phase 2 (admit cards/results) must not start until this phase's reliable ingestion or a documented, tested fallback is proven.

## Recovery and zero-cost verification — 2026-11-16 13:01 UTC

- **Isolated Cloudflare D1 restore drill PASSED**: Created disposable D1 `govradar-phase1-restore-drill-20261116` (synthetic record only), verified one test row, captured its Time Travel bookmark, deleted the row, confirmed zero rows, restored the disposable database to that bookmark, and confirmed the exact synthetic row returned. The disposable database was **deleted** and the account returned to its original three active D1 databases. **No real community, HQ, or GovRadar data was copied, restored, or deleted.**
- **Actual last-24-hour account-wide D1 usage** (Cloudflare Insights, UTC 2026-11-15 12:58 to 2026-11-16 12:58): **633,878 rows read**, **8,928 rows written**, **15,161 queries**, well below the published Workers Free D1 daily allowances (5,000,000 reads, 100,000 writes). GovRadar D1 used 487,159 reads, 5,313 writes and 8,808 queries; source catalogue remains 238 distinct source-observed rows. These are snapshot measurements, not a permanent $0 guarantee.
- **Workers Cron Free plan warning**: Cloudflare returned **6 configured Cron triggers** across the account (3 GovRadar and 3 across HQ Workers), versus the published Free limit of **5 per account**. No schedules were removed or added. Account subscription and actual billed Workers request usage could not be read via the current OAuth connector (HTTP 403, Billing Read not available). **Do not mark $0 release gate as satisfied until plan, request usage, and Cron consolidation are reviewed.**
- **Two-cycle Cron reliability signal**: `/api/ingestion-status` now exposes `automation.twoCycleCronGatePassed` and individual `recentNativeSuccessCount`/`twoCycleNativeProof`, only passing when **each** native source has 2 successful Cron imports in 8 hours, the newest native attempt is successful, and it is within 5 hours. The 13:01 UTC D1 audit showed **one native successful run per source**. This gate remains pending until real subsequent unattended imports appear; GitHub signed one-off tests are never counted.
- Detailed verified evidence and founder-controlled incident playbook: `PHASE1_RELIABILITY_AND_RECOVERY.md`.
- Staging Worker was securely redeployed after implementing the two-cycle status, preserving its encrypted `INGEST_HMAC_KEY` and original D1 binding with strict inheritance. The first CI smoke run expected the new status before this deployment and failed; its unit and browser tests had passed. The next CI smoke must pass against the updated staging runtime before calling the change verified.

## Evidence URLs
- Draft PR 7: https://github.com/solopreneursid/YorpHives_Website/pull/7
- Official India index: https://employmentnews.gov.in/newemp/AllJobs.aspx?k=All
- DfE API: https://teaching-vacancies.service.gov.uk/api/v1/jobs.json
- Manitoba RSS: https://jobsearch.gov.mb.ca/rss/newJobPostingsFeed.rss
- Staging: https://hqventures-govexam-parity-preview.solopreneursid-proy.workers.dev/
