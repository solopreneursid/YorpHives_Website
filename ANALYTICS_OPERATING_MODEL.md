# YorpHives privacy-respecting first-party analytics

## Scope and integrity

**Started November 16, 2026.** No historic traffic or tool usage is invented.
This implementation is an independently deployable, portable Node/SQLite-style
aggregation workflow, currently hosted via Cloudflare Pages Functions + D1.
There are no proprietary analytics SDKs or paid telemetry subscriptions.

**Two different data sources must not be confused:**

1. **Impact / visiting sessions:** Count of distinct random **browser-tab
   sessions** with activity in the last 30 UTC days. A person using two
   tabs or devices may count twice; this is **NOT 30-day unique people**.
   Also displays page views from site section navigation and direct tools.
2. **YHpulse / completed actions:** Counts client-reported successful result
   changes after supported tool interactions. It does **not** count mere
   clicks, opens, or failed processing. Rankings are indicative rather than
   cryptographically verified. Products and tools must pass the public
   catalog's publication and founder-qualified product gates.

Public pages never show unavailable partner, revenue, or approval statistics
as if they were known facts. Current revenue-direction publication remains
separately founder-approved and off by default.

## Privacy controls

- Only same-origin `POST /api/insights/collect` is accepted.
- Browser-generated random UUID is scoped to sessionStorage (browser tab).
  D1 stores only its SHA-256 digest and a UTC day; no cookie or persistent
  visitor identity is created by this system.
- Browser Do Not Track and Global Privacy Control are honored.
- Users can switch off/on anonymous analytics using the footer control.
  The choice persists in localStorage only as a privacy preference.
- No full URL/query string, IP address, User-Agent, fingerprint, tool input,
  output, file name, email, location, browser metadata or request body is
  stored. Source data is handled locally by tools.
- Dedupe keys and session digests older than 35 days are purged. Aggregate
  counts are also retained for at most 35 days. Cleanup is opportunistic
  on reporting requests; idle databases may retain old rows until accessed.
- No cross-site scripts, third-party telemetry, advertising pixels or
  cookies have been added.
- Input bounds, same-origin checks, bot/monitoring UA exclusions, public
  catalog allowlisting and minute/5-minute duplicate windows help reduce
  accidental inflation. A determined malicious client can forge browser
  events, so claims must remain qualified.

## Data contracts

`POST /api/insights/collect` sends only:

```json
{"event":"view","route":"home","sessionId":"random UUID"}
```

or after observable success from a published tool:

```json
{"event":"complete","url":"tools/word-counter/","sessionId":"random UUID"}
```

`GET /api/insights/public` returns cached **public aggregates**:

```json
{"schemaVersion":1,"available":true,"periodDays":30,
 "traffic":{"estimatedSessions30d":0,"pageViews30d":0,"uniquePeople30d":null},
 "usage":{"metric":"browser_reported_completed_actions","ranked":[]}}
```

Zero is shown only if the database confirms it; absent reports display
unavailable, not a fabricated figure.

## Database and portability

- Source DDL: `analytics/schema.sql`. D1 uses SQLite SQL.
- Production DB: `yorphives-public-insights`.
- Preview DB: `yorphives-public-insights-preview` (never used to
  populate production results).
- Pages Function binding: `INSIGHTS_DB`.
- Data tables: `visitor_sessions`, `daily_pageviews`,
  `daily_completions`, `event_dedupe`, `cleanup_log`.
- Production changes are deployed from
  `release/yorphives-reimagined-20261116` only.

## Future improvements and qualifications

- For actual **unique people / daily unique visitors**, use a secure,
  separately authenticated, *hostname-filtered* edge analytics source and
  label its methodology. Summing daily unique visitors into a month is NOT
  30-day unique people, and zone-wide counts may contain subdomain activity.
  Cloudflare GraphQL was tested for read access but does not give our public
  function the required scoped token automatically. This field remains null.
- Advanced native tools with custom output surfaces might not trigger the
  generic successful-result observer. Add an explicit first-party success
  event adapter after validating the processor; never count a mere click as
  a completion.
- Optionally add real privacy-reviewed opt-in consent by region before
  collecting non-essential client-side analytics where legally required.
- When daily event volumes exceed included free limits, aggregate
  higher-frequency events in memory or on the founder's own SQLite server,
  preserving the same JSON contract. Do not add vendor-locked analytics.
- Review automated traffic and abuse evidence before advertising strong
  popularity or business-success claims.
- HQ may observe/report metrics; it cannot write website code, change
  approval flags or deploy production. The founder remains the executor.

## Release verification

Run the existing Node tests and release-check for both production and
preview. Test a first-party event in staging: first submission counted,
replay ignored, invalid URL rejected; inspect the isolated preview D1
for non-zero totals; check the public report, YHpulse, responsive views,
opt-out behavior and full direct tool processing. Never seed live figures
using staging test events.
