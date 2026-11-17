# Independent edge watchdog — operating runbook

A separate Worker (`yorphives-edge-watchdog`) checks `https://yorphives.com` every **15 minutes**. It does not run inside the production site Worker or HQ and therefore continues probing if the website itself fails.

Checks: home and SEO noindex, API runtime marker, OpenAPI 3.1, read-only agent catalog, analytics availability, 30-day growth response, pinned model HEAD, missing-path 404. No analytics event POSTs, user data, source mutations, automatic code changes, deployments, credentials or outside AI tools.

Workers KV namespace `YORPHIVES_PROD_EDGE_HEALTH` stores only `latest` (24-hour TTL) and quarter-hour `history/YYYY-MM-DD/HHMM` (7-day TTL). This is a small low-cost incident evidence trail. Every unhealthy check logs `edge-health-failure` with affected probe IDs in Worker logs. KV may be eventually consistent, so status observations are indicative and not transactional.

Public endpoint: `https://yorphives-edge-watchdog.solopreneursid-proy.workers.dev/status` provides a sanitized read-only status; it returns 503 when unhealthy, missing, or stale (>35 minutes), never false 200. Other paths and all non-GET methods return 404. This endpoint is a possible direct input to the read-only HQ workforce; HQ must never receive KV write tokens or Worker deployment credentials.

## Verification and incident response

1. Confirm the Worker deploys and the Cron Trigger is installed independently of YorpHives.
2. After the first scheduled run, `/status` must report `available:true`, `stale:false`, and the seven probe states. A still-unavailable response means **monitoring is not proven**; inspect Worker logs and cron settings.
3. On a failure, independently test live homepage, public API, models and Cloudflare route. Distinguish sustained outage from transient probes and propagation.
4. The only website rollback is the founder-authorized deletion of the recorded route `efde34f924b84583a40bf0777b996658` in zone `1ce6b0c59175928a8687797c3cdbff2f`, which restores existing Pages origin routing. **This monitor never performs rollback itself.**
5. Keep history and post-incident root cause in HQ research journal; founder reviews any remediation.
6. No independent external notification channel is configured yet. Worker logs and the status endpoint are not push alerts. An additional founder-approved alert transport and a live rollback drill are prerequisites for fully verified disaster recovery.

## Data recovery policy

The production D1 database has a recoverable point-in-time bookmark confirmed through Cloudflare's `GET /d1/database/{id}/time_travel/bookmark`. This proves a bookmark exists; it does **not** prove a restore or independent backup is functional. Never run a restoration against live D1 as a test. Use a separately created disposable D1 database and a verified export/restore test, validate tables and aggregates, then delete only the disposable copy after written evidence. Independent off-Cloudflare encrypted exports remain a further resiliency milestone.

## Verified disposable D1 recovery exercise — 2026-11-17

**Test database only:** `yorphives-recovery-drill-20261117` was created separately from production and staging.

- Created an isolated SQLite-compatible `daily_pageviews` table and inserted a seven-view synthetic fixture.
- Recorded the database's D1 Time Travel bookmark.
- Deliberately inserted a second synthetic row, confirming two rows and 106 views.
- Restored the **disposable** database to the earlier bookmark using the Cloudflare D1 Time Travel restore API.
- Queried the recovered table: exactly one original `home` row with seven views remained.
- Deleted the disposable D1 database; confirmed account database count returned to eight.
- No production or staging database was restored, modified, or deleted during this exercise.

**Result:** Real point-in-time restoration on an isolated D1 database passed. Production D1 bookmark availability is confirmed, and a staging D1 SQL export completed. The staging export URL could not be fetched from the available execution environment, so an actual SQL export-to-fresh-D1 import is **not yet verified**. Production off-provider backups, restore time objective and live rollback drill are still pending. Do not describe those gates as complete.

## Portable future state

The monitor needs only standards-based `fetch`, `scheduled`, and a simple KV `get/put` adapter. For a self-hosted setup, replace KV with local SQLite and Cron with systemd timers, preserving the same check set and response contract. The monitoring implementation cannot issue changes to YorpHives, HQ or deployment infrastructure.
