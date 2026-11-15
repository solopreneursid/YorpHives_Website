# YorpHives v1.8.1 — Free Optional Portrait AI

Release date: 2026-11-16
Base: `release/v1.8-local-ai-background-remover-rc1`
Proposed release: `release/v1.8.1-free-portrait-rc1`
Total tools unchanged: **143**.

## Founder-enforced zero incremental cost policy
- **No paid inference, APIs, subscriptions, GPU servers, managed storage, Worker AI, or Pages Functions.**
- Both models and WASM engine served as ordinary static Cloudflare Pages assets, with inference in the visitor's browser.
- Cloudflare documents that Pages **static requests are free and unlimited** on Free and Paid plans; see https://developers.cloudflare.com/pages/functions/pricing/.
- Cloudflare Pages Free plan has **25 MiB per-file limit**, **20,000 static files**, and monthly build quotas; our new model is 6,632,188 bytes, safely below the 25 MiB limit.
- We cannot independently confirm the founder's **entire Cloudflare bill** because billing API access returned HTTP 403. This release does not activate any separately metered service, and makes no unconditional guarantee about unrelated account usage.
- If a future pricing or platform change introduces incremental paid charges, **remove the optional portrait model and revert to lightweight on-device processing**. Never introduce a paid dependency as a fallback.

## Open model and licensing
- Existing **U²-Net-small, 4,574,861 bytes**, Apache-2.0, default for general images, untouched.
- Optional **MODNet Portrait int8**, Apache-2.0, exactly **6,632,188 bytes**, pinned SHA-256 `92e49898c3e05a6d7a944fc67a8cb87c4aad754ffb6ebd949528c7d1105fee3a`.
- Upstream: https://github.com/ZHKKKe/MODNet and quantized ONNX conversion https://huggingface.co/Xenova/modnet, revision `7e0f55f28727b43369531f75e0539ecc4912af82`.
- The signed-off first download came from upstream, verified by checksum. To make builds repeatable without Hugging Face 429 limits, it can also be copied from an existing SHA-verified **YorpHives Pages static deployment**, with the same strict hash check.
- No model is downloaded until the visitor explicitly starts it; lightweight remains the default, portrait mode is opt-in.
- Portrait input: 512×512 RGB CHW normalized [-1,1]; alpha matte output is used without min/max stretching.

## Tests and release gates
- 251 automated tests passed, zero fail, in both production and noindex preview build targets.
- Actual browser-mode synthetic MODNet test passed: loaded own-origin model, generated finite 512×512 matte and valid transparent PNG, with opaque and transparent regions.
- Full UI flow passed in Chromium mobile emulations: portrait 390px, lightweight 320px; input selection, opt-in lazy download, transparent PNG export, refinement, reset to lightweight, no horizontal scroll, and no remote runtime requests.
- All 143 existing tool pages, YHpulse and the homepage remain unchanged outside Background Remover.
- Source changes include only one optional AI model, its build-copy script, tests, self-hosted license/attribution, immutable static cache rule, and Background Remover interface.
- No native physical Safari, Firefox, or low-end iOS/Android hardware acceptance completed; the interface warns about resource limits and suggests the lightweight fallback.
- Model accuracy depends on the image. A successfully running model is not a guarantee of consistently better hair removal.

## Deployment control
Release only after success in a dedicated noindex review deployment. Preserve previous production for rollback and **disable automatic Cloudflare production deployments again** after verified success.
