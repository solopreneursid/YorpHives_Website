# YorpHives — Reimagined production release

Release initiated: 2026-11-16
Target website: https://yorphives.com/
Cloudflare Pages project: yorphives-v1-live
Production Git branch: release/yorphives-reimagined-20261116

## Release contents

- The redesigned YorpHives site is served at the domain root, not a /reimagined/ folder.
- Seven views: Home, HQventures, Builders, Impact, Free Tools, Partnerships, Contact.
- Cloud-based AI-powered venture studio brand and YorpHivesHQ/founder boundary preserved.
- 143 published free-tool entry points and browser-local processors maintained.
- Shared data source for tool library, Impact counts, ecosystem categories and qualification-gated launches.
- Honest YHpulse most-used and public-revenue empty states until actual evidence is approved.
- Slim rotating discovery strips with pause and reduced-motion support.
- Prominent **Ko-fi · Support us** disabled on site and tools. No payment links.
- Legacy fragment links #explore, #connect, #opportunities and #membership resolve to new destinations.
- Company-specific CSS, JavaScript and aggregate JSON are first-party and configured with fresh/no-store caching.
- No new analytics tracking or paid third-party dependencies added by this release.
- Production output strips preview banner and preview noindex; source demo remains preview-only.

## Validation and release gate

The review project ran production and preview builds, Node tests and the release-check.
Browser QA passed at 320, 390, 768 and 1440 pixels on the root-equivalent /release-candidate/ path.
Verified real Word Counter processing and a simulated 143→144→143 catalog update cycle,
without modifying real published catalog data.

Before declaring success, independently check the actual production Pages deployment and
yorphives.com. A successful test of a preview URL does **not** prove production deployed.

## Previous live rollback anchor

Previous production branch: release/v1.8.1-free-portrait-rc1
Previous Git commit: e361cb25f948c9ab423766b235b9cad3e70857ed
Previous Cloudflare Pages deployment ID: f740b2c8-4109-4602-ae70-0f005e30e393

Rollback: restore the previous Pages deployment and restore the previous production
branch setting if rollback is required. Do not delete the old deployment.

## Remaining honest limitations

- Unique-user analytics, active partners, revenue-direction graph and true most-used
  rankings need verified data-collection/reporting before publication.
- Builders membership is not accepting registrations, and Contact prepares a
  user-reviewed email rather than submitting directly to a server.
- The seven marketing views currently use hash navigation; individual tools
  retain canonical page URLs. Consider separate crawlable marketing landing
  pages as an SEO improvement after this release stabilizes.
