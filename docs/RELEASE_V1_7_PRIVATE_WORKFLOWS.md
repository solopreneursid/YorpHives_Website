# YorpHives v1.7 — Private Utilities & Image Workflows

Release date: 2026-11-15
Base production release: release/v1.6-creative-media-rc1
Release candidate: release/v1.7-private-workflows-rc1
Total free tools: **142** (previously 134).

## New free tools
1. Batch Image Converter — 1–10 JPG/PNG/WebP inputs to local ZIP, output resize and compression.
2. PDF Metadata Inspector & Cleaner — inspect and clear supported standard Info fields; **not forensic sanitization**.
3. Excel & CSV Merger — 2–8 CSV/XLSX inputs, union/strict headers, deduplication and optional source column; safely escaped CSV and text-valued Excel output.
4. Audio File Merger — 2–6 audio clips, reordering, fades and locally rendered WAV.
5. Voice Recorder — explicitly permission-gated local microphone recording (max two minutes), browser-supported output format.
6. Password Strength & Pattern Analyzer — private heuristic only; no password uploads or password retention.
7. Business Proposal PDF Generator — multi-page local PDFs with scope, deliverables, timeline and optional costs.
8. Image Publishing Pack Workflow — **actual resize → convert → compress pipeline** with three ZIP assets and no uploads.

## Guided, non-automatic paths
- Document: scan → searchable PDF → metadata inspection → redaction.
- Business: proposal → quotation → invoice.
These paths intentionally require user downloads and manual file selection between independent tools; no background upload or automatic file transfer.

## Verification and quality
- 240 automated tests passed in both production and preview build targets, zero failures.
- Browser acceptance confirmed valid JPEG, WebP and ZIP assets, standard PDF Info removal, CSV/XLSX merge, WAV audio, PDF proposals, password assessment, and a synthetic microphone stream.
- All eight UI submission workflows passed synthetic browser interaction tests.
- Source and runtime assets are self-hosted with no paid external API.
- Existing site navigation, Explore, Builders, homepage, YHpulse and 134 previous tools preserved.
- New pages use mobile-first form controls; full native iOS Safari and Firefox physical-device testing remains a separate requirement.
- 142 canonical tool pages, 144 sitemap URLs, and 20 YHpulse shortcuts.
- Preview-only QA scripts must never ship in production assets.

## Known limitations / guardrails
- PDF Metadata Cleaner clears supported standard Info fields only. Hidden XMP, media resources, attachments, document content or other identifying traces may remain.
- Excel & CSV Merger reads the first worksheet of .xlsx, does not preserve formulas/formatting, and protects against formula-like CSV input.
- Password analyzer is a heuristic, not a leak database lookup or guarantee.
- Microphone permissions and output codecs vary by browser.
- WebP encoding depends on browser support.
- Batch sizes and duration are deliberately bounded for phones.
- AI Background Remover is **not included** in this release. A separate model-license, size, download, accuracy and memory review is required before publication.

## Operational controls
1. Promote only after the candidate preview succeeds and user-facing browser checks pass.
2. Verify live catalog contains exactly 142 tools and all eight URLs are HTTP 200.
3. Disable automatic Cloudflare production deployments again after success.
4. Preserve the v1.6 release for rollback.
