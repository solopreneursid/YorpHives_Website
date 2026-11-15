# YorpHives v1.8 — Private On-device AI Background Remover

Release date: 2026-11-16

Base: `release/v1.7-private-workflows-rc1`; proposed release: `release/v1.8-local-ai-background-remover-rc1`.
Public Free Tools catalog: **142 → 143**.

## What shipped
- **AI Background Remover** at `/tools/ai-background-remover/`.
- On-device U²-Net-small (u2netp) saliency segmentation with adjustable cutout strength and edge softness, and transparent PNG export.
- Side-by-side original/output previews, checkerboard/white/dark preview colors, device-friendly export resolutions (800/1200/1600), explicit reset and download controls.
- Explicit opt-in inference; models are not fetched before the visitor starts processing an image.
- JPEG, PNG and WebP; input ≤10 MB and ≤12 MP; local PNG output ≤20 MB.
- Open-weight model and WASM inference runtime both served under YorpHives's origin, no paid API, no uploaded photos, no third-party runtime CDN.

## Versioned and auditable dependencies
- U²-Net-small model: Apache-2.0, original authors Qin et al. / Apache 2.0; weights from rembg release.
- Model: `u2netp-309c8469.onnx`, 4,574,861 bytes, SHA-256 `309c8469258dda742793dce0ebea8e6dd393174f89934733ecc8b14c76f4ddd8`.
- ONNX Runtime Web: pinned MIT build, `1.31.1`, single-thread WebAssembly, no WebGPU requirement.
- Model downloads happen only during site build, with a mandatory SHA-256 verification. The site serves cached same-origin immutable model weights.
- Full license and model provenance under `tools/models/`.

## Verification
- Automated release suite: **246 passed, 0 failed** in production and noindex preview builds.
- 143 direct published tool pages; 145 canonical sitemap URLs; 20 YHpulse updates; previous homepage unchanged.
- Real ONNX model executed in Chromium browser, successfully produced a valid transparent PNG from synthetic foreground test image.
- Real engine tests: 9 checks, including license, tensor shape, finite saliency, alpha transparency, decodable PNG and mask adjustment without re-running inference.
- Live-interface test: all 10 checks pass at 320px, 390px, 768px and 1366px, including file selection, image processing, download, alpha verification, edge refinement, reset, no horizontal scrolling, no external network calls.
- Chromium synthetic benchmark: initial full run approximately 7.8 seconds, core inference approximately 1.5 seconds on test environment. Speeds will vary considerably on real hardware.
- Preview QA scripts are excluded from production assets.

## Limitations & governance
- The lightweight model can struggle with fine hair, glass, transparent objects, multiple subjects, low contrast and busy backgrounds; results must be reviewed before publishing.
- No native physical Safari, Firefox or low-end Android testing completed; only Chromium and responsive viewport simulation. Unsupported browsers should display a clear error.
- CPU WASM may use significant memory; the tool enforces resource limits.
- The HQ observation/recommendation-only boundary remains untouched. The founder-authorized release system executes deployment.
- Production auto deployments must be disabled after verification and the v1.7 deployment retained for rollback.

## Next upgrade
- Benchmark and evaluate carefully licensed, optional higher-quality model(s) against natural rights-cleared photographs and physical iOS/Android devices.
- Keep the model plug-and-play, with pinned checksums and no cross-origin runtime requests.
