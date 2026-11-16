# GovRadar Phase 1 — official source ingestion release gates
Updated: 2026-11-16. Working branch: `feat/govradar-phase1-sources-20261116`.
This checklist is intentionally evidence-based. **Do not mark automatic synchronization successful just because the Worker is deployed or a one-time import worked.**

## Completed in code
- DfE and Manitoba sources: strict HTTPS same-origin redirect checks, bounded retries for transient network failures, limited response sizes and per-run audited outcomes.
- India Employment News **adapter pilot**: source-specific parser and unit tests for government-published factual recruitment index summaries. Requires an explicit closing date and rejects expired, impossible, duplicated, or malformed rows.
- Source-specific country filtering, India summary labelling, browser UI, additive SQLite/D1 source records, no subscription or proprietary runtime.
- Existing Source D1 records and production yorphives.com are not modified by this source branch except that its isolated GovRadar staging Worker is updated for verification.
- GitHub Actions CI covers tests, responsive-browser flows and read-only source reachability.

## Current external evidence
- Cloudflare Worker Cron schedules are active at `0 */3 * * *` (site checks), `20 */3 * * *` (UK DfE) and `40 */3 * * *` (Manitoba).
- DfE scheduled attempt at 2026-11-16 09:20 UTC failed with `network_error` before new recovery was deployed.
- Manitoba scheduled attempt at 2026-11-16 09:40 UTC also failed with `network_error`, while GitHub Actions successfully fetched its official RSS (HTTP 200, 56 items, 53 eligible).
- GitHub Actions read-only India probe fetched Employment News official site (HTTP 200, 16 HTML table rows, 2 eligible future-closing summaries on that snapshot); `robots.txt` responded 404. **404 is not a grant of redistribution rights.**
- Imported D1 baseline remains 100 UK DfE and 53 Manitoba records from explicitly documented one-time imports, not successful recurring source ingestion.

## Release BLOCKERS
1. **Recurring fetch proof**: after the safe redirect/retry updates, observe and independently verify at least one successful scheduled run for each UK and Manitoba source in `source_ingest_runs`. Distinguish bootstraps from scheduled success. Check `source_feed_cursors` and row timestamps advance; ensure failures never invent rows.
2. **India reuse policy**: Employment News editorial guidance requires prior permission for reproduction of its published articles. This index parser only extracts minimal factual summaries, but no legal reuse permission for a commercial copy/aggregation has been established. Keep the India Cron trigger **UNCONFIGURED**, do not bootstrap its rows, and do not market India live aggregation until permission is verified or replace the source with a clearly reusable official feed. Its source link and read-only probe can remain.
3. **Source-specific accuracy review**: every source must preserve the official URL, date, employer, jurisdiction, source attribution and proof. Unverified summaries cannot be labelled directly-verified vacancies or official application links.
4. **Zero-cost quotas and no regressions**: confirm Cron/D1/Worker daily consumption stays within free tiers; ensure all existing YorpHives pages unchanged. Main branch and production deployment must remain untouched.
5. **Fallback if Cloudflare outbound fetch stays restricted**: create a portable, first-party Node scheduled reader (self-hosted) or narrowly scoped GitHub Actions source collector with protected destination credentials; never use a third-party proxy or simulate success.

## Portable fallback (implemented, fail-closed until activated)
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
- The GitHub fallback runs at `55 */3 * * *` UTC and skips sources with successful imports less than two hours old, reducing duplicate writes and free-tier usage. GitHub schedules are not exact-time guarantees. It must not be described as live until the first real signed import succeeds.

## Next steps
- Re-test isolated Cloudflare preview after deploy; inspect API metadata and mobile browser UI.
- Observe next 3-hour Cron ingestions through D1 history; do not assume a next run will succeed.
- If repeated network errors remain, implement/test the owner-controlled Node collector fallback, with retries, signed/audited ingestion and least-privilege credentials.
- Expand independently verified India/state feeds only after source terms, format and direct notice evidence are established.
- Phase 2 (admit cards/results) must not start until this phase's reliable ingestion or a documented, tested fallback is proven.

## Evidence URLs
- Draft PR 7: https://github.com/solopreneursid/YorpHives_Website/pull/7
- Official India index: https://employmentnews.gov.in/newemp/AllJobs.aspx?k=All
- DfE API: https://teaching-vacancies.service.gov.uk/api/v1/jobs.json
- Manitoba RSS: https://jobsearch.gov.mb.ca/rss/newJobPostingsFeed.rss
- Staging: https://hqventures-govexam-parity-preview.solopreneursid-proy.workers.dev/
