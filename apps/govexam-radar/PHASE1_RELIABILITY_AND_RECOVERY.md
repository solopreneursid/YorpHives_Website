# GovRadar Phase 1 — verified reliability, free-tier and recovery controls

Date: 2026-11-16 (UTC). **Staging-only**, PR #7. No changes to `main`, `yorphives.com`, or deployed HQ Workers.

## Scope and restrictions

- Cloudflare account: `69234e51e08d8013980a7ff869746609`.
- Only GovRadar staging Worker: `hqventures-govexam-parity-preview`.
- Shared GovRadar D1: `b1f499a6-283b-47e8-8cd7-ef2b5f7245bc` (`hqventures-govradar-community`). This is **not** a disposable database; it contains community and catalogue data.
- Never test a destructive restore, migration, or data reset on the shared D1. Never export personal data to public CI logs. A Cloudflare Time Travel restore **overwrites the database in place**, and Cloudflare does not currently support cloning it via Time Travel.
- Keep Cloudflare `INGEST_HMAC_KEY` encrypted and preserve the D1 binding using `{type:"inherit",name:"INGEST_HMAC_KEY"}` with `?bindings_inherit=strict` in any staging deployment.
- India Employment News is research-only; **do not publish or schedule India ingestion without resolving commercial reuse terms**.

## Real unattended Cron evidence and two-cycle release gate

D1 `source_ingest_runs` is the source of truth, not successful Worker-invocation logs.

| Source | First audited native scheduled success | Audit proof |
| --- | --- | --- |
| UK DfE | 2026-11-16 12:20:37 UTC | Page 2, 100 accepted, cursor page 3, `origin=scheduled` |
| Manitoba | 2026-11-16 12:40:29 UTC | 15 accepted from eligible RSS; cursor advanced, `origin=scheduled` |

One-time authenticated GitHub collector tests (`origin=signed_portable_collector`) are **not** native Cron evidence. Initial one-time bootstrap imports are also excluded.

`/api/ingestion-status` now reports both `automation.healthy` (last native success within 24 hours) and the separate **`automation.twoCycleCronGatePassed`**. The latter is true only when **both sources** have at least two native Cron successes in the past 8 hours, their last native attempt was successful, and that success is within 5 hours. This is only a *Cron reliability gate*, not overall launch authorization.

The next distinct native schedule windows from the recorded first successes are 15:20 and 15:40 UTC. A completed scheduled event can be late. Never fabricate second-cycle proof from a manual signed upload, an API health check, or elapsed time. Do not infer repeated operation from one successful cycle.

## Actual Cloudflare D1 usage observation

Cloudflare D1 usage endpoint `GET /accounts/{account_id}/d1/insights/databases` returned this 24-hour window:
`2026-11-15T12:58:12.387Z` to `2026-11-16T12:58:12.387Z`.

- All connected account D1 databases, including historical deleted drills: **633,878 rows read**, **8,928 rows written**, **15,161 queries**.
- GovRadar D1: **487,159 rows read**, **5,313 rows written**, **8,808 queries**.
- Three **currently active** D1 databases. GovRadar D1 size at check: **466,944 bytes**.
- Published Workers Free D1 allowances at verification: **5,000,000 rows read/day**, **100,000 written/day**, **10 D1 databases**, **500 MB per database**, **5 GB total account D1 storage**, **7-day Time Travel**. Do not assume all account services will stay within those allowances as traffic grows.
- **Cron quota issue**: Cloudflare reports **six configured Cron triggers** across Workers. GovRadar has three (portal checks + UK + Manitoba); three belong to separate HQ Workers. Published Workers Free limit is **five per account**. No existing HQ schedules were changed. Before a $0 release claim, independently confirm the actual Workers plan and choose a safe consolidation of at least one existing schedule if using Workers Free. Never silently delete an HQ job.
- Workers request-count billing usage was **not verified**: the account's current Cloudflare OAuth connection lacks Billing Read, and `GET /accounts/{account_id}/billing/usage?metrics=workersRequests` was rejected with HTTP 403. Workers observability **log event counts are not request/billing counts**. The account subscription list is also inaccessible with this OAuth connection (Billing Read required).
- Avoid adding any new Cron trigger until the account plan/quotas are confirmed. Shared-account resource limits apply to HQ as well as GovRadar.

## Completed isolated restore drill — no live data copied

Test database `govradar-phase1-restore-drill-20261116`, ID `04f36b9a-e072-4bac-b512-05ad40a02474` (now **deleted**):

1. Created a new D1 database, `version=production`, with only `recovery_probe(id,source_id,proof)`.
2. Inserted one fully synthetic record: `synthetic-001`, `synthetic-feed`, `recovery-d1-2026-11-16`; confirmed count 1.
3. Recorded D1's Time Travel bookmark.
4. Deleted the synthetic row and independently confirmed count 0.
5. Restored the **isolated test database only** using `POST /accounts/{account_id}/d1/database/{test_database_id}/time_travel/restore?bookmark=...`; restore reported success and prior bookmark.
6. Independently queried the test database; **synthetic row and contents recovered exactly**.
7. Deleted the disposable D1; verified it no longer appeared and the account again had **3 active databases**.

This establishes Cloudflare D1 point-in-time recovery **on a disposable database**, not application-level restoration of the shared GovRadar or HQ data. No real applicants, community users, or HQ records were exported, copied, deleted or restored.

## Controlled recovery procedure for a real GovRadar incident (requires founder decision)

1. **Observe first, don't mutate**: capture source error codes, newest `source_ingest_runs`, public API status, Worker version, D1 row counts, and current D1 bookmark. Verify the correct Worker and database IDs.
2. **Contain the incident**: do not automatically delete records, rotate production secrets, disable all HQ jobs, or restore the shared D1. A person must approve changes that would interrupt users or community data.
3. **Choose the least destructive option**: source failures often recover without restoring any database. For software-only failure, review rolling back **Worker code**, preserving current secrets and bindings. A Worker rollback does not roll back D1 contents.
4. **Before any shared D1 Time Travel**: obtain founder approval identifying the exact restore timestamp, estimated loss of writes since that point, community impact and rollback route; preserve an independent private export if authorized and available. Time Travel overwrites the live database and aborts in-flight activity.
5. **If an approved restore proceeds**, only the authorized operator may restore the exact GovRadar D1 ID through Cloudflare's dashboard or Time Travel API. Confirm row counts and source audit integrity afterward; do not expose source or community data in public logs. Save the previous bookmark to allow undo, subject to its retention validity.
6. **Validate services**: check both live source-import cursors and public disclaimers, community API health, Worker secret binding, and the read-only notice API. Restart or re-enable scheduled activity only after verifying integrity and founder approval.
7. **Post-incident audit**: record before/after state, affected users, row loss, cause, rollback/restore decisions and tests without storing secrets.

## Final production release blockers

- Two observed native scheduled successes per source within the defined gate, with no more recent native failure. **Not yet achieved at the time of the first reading (one per source).**
- Billing Read or founder dashboard evidence confirming Workers plan and **actual account-wide daily Workers requests**, and resolution/clarification of **six configured Cron triggers against a Free limit of five**.
- Permission/accuracy checks for new sources, India licensing, and source freshness.
- Founder-reviewed release of the **currently draft PRs** to the appropriate deployment branch. GitHub signed collector's scheduled fallback still runs **only on a reviewed default-branch release**; do not claim it is already recurring.
- Continue verifying long-term reliability; a two-cycle gate is useful evidence but not proof of months of operation.

## Official references

- Cloudflare D1 Limits: https://developers.cloudflare.com/d1/platform/limits/
- D1 Time Travel: https://developers.cloudflare.com/d1/reference/time-travel/
- Workers Limits: https://developers.cloudflare.com/workers/platform/limits/
- Cloudflare D1 REST API: https://developers.cloudflare.com/api/resources/d1/
- Phase 1 detailed evidence: `PHASE1_RELEASE_GATE.md`.
