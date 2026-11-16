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

## Earlier external evidence (historical)
- Cloudflare Worker Cron schedules are active at `0 */3 * * *` (site checks), `20 */3 * * *` (UK DfE) and `40 */3 * * *` (Manitoba).
- DfE scheduled attempt at 2026-11-16 09:20 UTC failed with `network_error` before new recovery was deployed.
- Manitoba scheduled attempt at 2026-11-16 09:40 UTC also failed with `network_error`, while GitHub Actions successfully fetched its official RSS (HTTP 200, 56 items, 53 eligible).
- GitHub Actions read-only India probe fetched Employment News official site (HTTP 200, 16 HTML table rows, 2 eligible future-closing summaries on that snapshot); `robots.txt` responded 404. **404 is not a grant of redistribution rights.**
- Earlier one-time import baseline was 100 UK DfE and 53 Manitoba records. **Superseded by the verified 238-record staging snapshot above.**

## Release BLOCKERS
1. **Recurring fetch proof (partially satisfied)**: UK has one successful scheduled Cron import; Manitoba has one successful authenticated GitHub collector import, but a subsequent unattended Manitoba Cron or reviewed default-branch scheduled fallback is still required. Check sustained runs, cursors and failure-handling over time.
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

## Evidence URLs
- Draft PR 7: https://github.com/solopreneursid/YorpHives_Website/pull/7
- Official India index: https://employmentnews.gov.in/newemp/AllJobs.aspx?k=All
- DfE API: https://teaching-vacancies.service.gov.uk/api/v1/jobs.json
- Manitoba RSS: https://jobsearch.gov.mb.ca/rss/newJobPostingsFeed.rss
- Staging: https://hqventures-govexam-parity-preview.solopreneursid-proy.workers.dev/
