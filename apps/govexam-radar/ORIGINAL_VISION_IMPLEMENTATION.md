# GovRadar original-vision restoration — staging plan

Canonical product blueprint: founder-uploaded **GovExam & Job Radar — Global Technical & Non-Technical Government Jobs, Admit Cards & Email Alerts (Step 2).html**. Its email feature is **explicitly removed at the founder's direction**.

## Permanent product scope

The six original areas are retained: **Radar, Alerts & Updates, Feeds, Saved, Community, Guide**. The global product is the app; the UK DfE isolated candidate is only a restricted source/release proof, never the replacement for the global experience.

| Original vision | Current implementation | Required next gate |
| --- | --- | --- |
| 10-country government career/exam radar | Global six-tab responsive research view; official national/regional portal directory | Verified vacancy-by-vacancy coverage per licensed source |
| India first, state and central exams | UPSC, SSC, RRB, JPSC, IBPS, NCS and regional official-source directory; index adapter disabled | Per-source permission and exact official notice proof before automated import |
| Technical/nontechnical, location, citizenship | Browsable prototype research-lead filters; inferred type on official UK records | Source-backed eligibility per vacancy, never infer from nationality alone |
| Admit cards/results/exam lifecycle | Prototype research state and source links, explicitly unverified | Dedicated evidence-based exam events/links with dated audit |
| Feed synchronization | Bounded and audited UK/Manitoba staging collectors; separate private UK mirror | Two real unattended successful mirror runs, independent freshness evidence |
| Saved and alerts | On-device bookmarks, saved UK filters and opt-in visible-tab checking | Unified browser-local history, no remote notification service |
| Community | Separate server-backed moderation-gated staging prototype | Founder approval, abuse and privacy review |
| Guide | Founder-original educational section, adjusted to actual capabilities | Update progressively with shipped functionality |

## No email service
- Do not collect email addresses, store email preferences, create SMTP/email API integrations, display fake email queues, or advertise delivered email messages.
- Prefer on-device changes, read-only feeds, browser-local bookmarks and user-requested checks. Be explicit that no background delivery occurs.
- Historic function names in legacy demo code are **not** an enabled email service; remove those safely as the original script is modularized.

## Non-negotiable truth gates
- Separate **directory**, **research lead**, **source-observed record**, **reviewed official notice**, and **independently verified current vacancy**.
- Never call source URL reachability vacancy verification.
- Do not promote UK OGL reuse permission to Canada/India or other sources.
- Expired and withdrawn records retain non-destructive audit evidence; do not fabricate updates or erase history.
- No domain, production worker, payment or HQ write permissions without founder release.
- CI must pass and independent live browser verification is needed before launch.

## Delivery order
1. Restore global six-tab UI, eliminate email collection, and retain working source monitoring.
2. Verify UK mirror Cron audit and source freshness; keep unknown state visible until proven.
3. Unify browser-local saved searches and change history across the global app, while respecting source rights.
4. Improve India official-source directory and safely enable only lawful factual/attributed adapters.
5. Add verified admit card/result lifecycle as a separate evidence-backed domain, then country-by-country adapters.
6. Audit mobile UX, privacy, safety, accessible navigation, moderation and founder-approved release.

Status: **staging development**. Updating this document never asserts a production launch.

## India source-rights investigation (2026-11-16)
- **Employment News** editorial guidance explicitly reserves article copyright and prohibits reproduction of published articles or parts without permission. Do not assume this journal is openly reusable just because it is operated by a government ministry: https://employmentnews.gov.in/Editorial-Guidelines.pdf
- **Government Open Data License – India (GODL)** explicitly allows commercial and noncommercial reuse with attribution **for data actually published under that license**, not every government website or Employment News article: https://data.gov.in/Godl
- Result: keep Employment News content ingestion disabled pending source-specific rights. Explore individually licensed OGD datasets or official notice metadata as separate adapters, with accurate attribution, evidence and consent checks.
