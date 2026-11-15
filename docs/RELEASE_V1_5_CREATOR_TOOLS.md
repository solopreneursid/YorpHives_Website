# YorpHives v1.5 — Creator & Productivity Tools

Release date: 2026-11-15

## Base
- Previous production source: release/v1.4.2-mobile-rc1
- Preserves responsive homepage, YHpulse, navigation, Explore, Builders and all previous 118 tools.
- New total: **126 public free tools** in 15 categories.

## Eight new locally processed tools
1. Image Blur & Privacy Redactor
2. Favicon Pack Generator
3. Subtitle Editor & Converter (SRT/WebVTT)
4. Social Share Preview Builder
5. Quotation PDF Generator
6. Certificate Generator
7. Visual PDF Comparison Tool
8. Screen Recorder

## Verification
- Preview build passed 225 tests and 0 failures in production-mode and noindex preview-mode builds.
- Live-browser acceptance verified subtitle conversion, social metadata, quotation PDF, certificate PDF, ICO and PNG favicon output, irreversible image blackout, PDF visual difference ZIP, and synthetic screen recording.
- Mobile 390 px layout visually reviewed.
- Screen share uses browser permission and local MediaRecorder. Synthetic screen recording was verified, but real screen permission requires an end-user browser acceptance check.
- PDF compare is visual, not semantic. Pixelation is cosmetic; blackout is suitable for fully covering selected pixels.
- No paid runtime APIs, third-party CDN calls or file uploads introduced.
- Preview-only browser QA scripts must not be shipped to public production assets.

## Operational release controls
- Do not enable indefinite auto-deployments.
- Verify the resulting live catalog count is 126 and all eight new URLs respond.
- Keep previous deployment available for rollback.
