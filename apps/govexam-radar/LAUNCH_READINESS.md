# GlobalGovJobs preview and release notes

This is a staging preview, not an authorization to publish. It links to official government recruitment websites and displays a limited imported UK Department for Education Teaching Vacancies feed. Each record links back to the issuing service; a feed record is not a guarantee that a job is still open or that an applicant is eligible.

## Source and feature boundaries

- The public notices, notice changes and ingestion-status endpoints use the server-side UK-only source allowlist. An unknown or unapproved source cannot be selected through a query parameter. Expired notices and records not observed in the past 14 days are excluded from the notices endpoint. A missing item on a partial page is not proof of withdrawal.
- Manitoba and India Employment News research records remain in the original staging database, but are not exposed as public job results. Their source-specific commercial reuse must be established before adding either source. Do not infer permission from an accessible RSS feed or a general government licence.
- The Sashastra Seema Bal recruitment site has an official copyright policy allowing accurate reproduction with attribution, subject to its stated exceptions: <https://recruitment.ssb.gov.in/websitepolicyUrl>. Its official recruitment, admit-card and result pages are linked from the preview. This does **not** constitute an automated Indian jobs feed. Before adding an importer, verify the current site terms, robots and permitted access, parse and test real responses, exclude closed records, clearly attribute the source and monitor failures. As checked on 25 November 2026, the available advertisement table did not show an unexpired application date.
- Current admit-card and result pages are links to the authority, not automatically checked updates. There are no email alerts or push notifications.
- Community creation, public posts and moderation API calls are paused. Existing users can still use authenticated export and deletion endpoints; the contact address is available for requests. Reopen only after moderation staffing, abuse handling, privacy and recovery are implemented and verified.
- Browser-local bookmarks and older saved examples remain on the user's device. Old examples are clearly labelled and are excluded from search results. The source database and its research records are not deleted by this release.
- The low-data page uses the same approved notices API and government website directory, with English and Hindi controls. It does not change saved items on the device.
- The preview sends `X-Robots-Tag: noindex, nofollow` and its robots file disallows crawling. A separately reviewed production deployment needs deliberate domain, indexing, sitemap, canonical URL and privacy settings; never copy staging restrictions blindly into production.

## Verification

Run all unit and API tests from this directory:

```sh
npm test
```

The test suite includes an in-memory SQLite integration test that mixes approved and unapproved records, checks search and change feeds, verifies an unsupported country yields no jobs, and checks community and privacy boundaries. Browser tests exercise responsive widths, search, Hindi controls, source links and saved data. The browser suite needs the repository's Playwright setup.

An independent, read-only monitor is included and can run without credentials from a separately operated Node.js server. It checks service health, source boundaries, freshness, the India empty state, notice changes and policy availability. It emits a JSON report and returns a nonzero exit status on failure. For the current staging preview:

```sh
node launch-monitor.mjs https://hqventures-govexam-parity-preview.solopreneursid-proy.workers.dev
```

The monitor is a program, not a running monitoring service: arrange a separately managed scheduler, log storage and alert delivery before relying on it. It does not send messages or change infrastructure by itself.

## Recovery and deployment

Cloudflare D1 Time Travel was tested by creating a separate temporary database containing synthetic data, recording a bookmark, changing the test data, restoring the bookmark and checking the original value. The temporary database was then removed. A current recovery bookmark was also retrieved for the existing preview database without restoring it. This establishes that the recovery mechanism works on a test database; it is not an independent off-site backup of the live database or a tested restore of the actual preview dataset. D1 retention depends on the account plan. Arrange encrypted, access-controlled exports to independently owned storage and periodically test restoration before broad launch. Handle existing community data as personal data.

The staging Worker remains separate from production. Use the repository's guarded deployment tooling, preserve the existing database, secrets and scheduler, compare the intended source and active version, and verify the deployed API, browser flows and rollback target. A real production release also needs a confirmed domain, production-specific crawl settings, ongoing monitoring and a release decision after the above gaps are closed.
