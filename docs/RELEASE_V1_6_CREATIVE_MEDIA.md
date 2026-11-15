# YorpHives v1.6 — Creative Media & Document Tools

Release date: 2026-11-15
Previous production: release/v1.5-creator-tools-rc1
Target production: release/v1.6-creative-media-rc1
Public tools: 126 → **134**

## Eight browser-local tools
1. SVG Optimizer — pinned MIT SVGO browser bundle; validates XML and rejects unsafe resources.
2. Video to GIF Converter — pinned MIT gifenc; silent 0.25–6-second GIFs, 4–10 fps.
3. Document Scanner from Photo — one-photo manual four-corner correction; image-only PDF or JPG.
4. Meme Maker — captioned PNGs.
5. Color Picker from Image — HEX, RGB and HSL.
6. Pixel Art Maker — limited-color PNG art.
7. Audio Volume Booster & Normalizer — Web Audio with clipping limiter, WAV output.
8. Video Thumbnail Extractor — browser-decoded JPG or PNG video frame.

## Release verification
- 232 automated tests passed with zero failures in production and preview targets.
- Browser synthetic acceptance passed for safe SVG optimization, unsafe SVG rejection, image pixel sampling, meme PNG, pixel art PNG, document PDF, audio WAV, video-thumbnail PNG, valid animated GIF bytes and GIF image decoding.
- No external file uploads or paid runtime APIs.
- SVGO and gifenc shipped from this origin with their license texts.
- Mobile layouts visually reviewed at 390 px.
- SEO, sitemap, canonical URLs and structured-data checks passed for 134 tools.
- Static YHpulse remains limited to 20 published updates.
- Preview-only QA scripts are excluded from the public production build.

## Known limitations
- Document scanner processes one photo per export, with manually adjusted corners; no OCR.
- GIF conversion is silent, color-limited, small-clip only, and browser-codec-dependent.
- Audio output is WAV; not all audio codecs are supported by all browsers.
- SVG optimizer deliberately rejects scripts, foreign resources and some unsupported elements.

## Release controls
- Publish only after successful preview deployment.
- Verify live catalog = 134, new tool URLs serve HTTP 200, YHpulse remains intact.
- Disable automatic production deployments after success.
- Prior production deployment is kept available for rollback.

## Production release trigger
Founder-authorized deployment after 232 passing automated tests, 10 browser acceptance checks, healthy preview, and a verified prior v1.5 production release. Temporarily enable production builds for this single release; disable them after the new deployment succeeds and live URLs are checked.
