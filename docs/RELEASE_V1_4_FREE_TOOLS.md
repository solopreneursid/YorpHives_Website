# YorpHives v1.4 Free Tools — Verified Release

Date: 2026-11-15
Previous live: release/v1.3.1-explore-copy-rc1 (107 tools)
New release: release/v1.4-tools-verified-rc2 (118 tools)

## New public utilities
- Fill PDF Forms
- Flatten PDF Forms
- ZIP File Extractor
- CSV Cleaner
- Photo Collage Maker
- Resume / CV Builder
- HEIC to JPG Converter
- Audio Trimmer
- PDF Redaction Tool
- Scanned PDF to Searchable PDF
- Video Trimmer

Batch File Renamer and ZIP Contents Viewer were already present.

## Release gates
- 206 automated regression tests passed in both production-mode and noindex preview builds.
- All 118 direct-entry tool URLs, canonicals, structured-data records and sitemap entries validated.
- YHpulse retained 20 verified public updates.
- Real browser acceptance passed for all six Wave 2 tools and PDF redaction, scanned PDF OCR and video output.
- Genuine 718 KB HEIC sample converted to JPEG using the locally bundled HEIC library.
- Mobile file picker and spacing visually reviewed.
- No paid runtime APIs, external CDN dependencies or file uploads introduced.
- All browser QA scripts are excluded from production output.

## Operational controls
- Source stays GitHub-managed and provider-neutral/static.
- Preview/QA before production.
- Restore the previous production branch and deployment if release verification fails.
