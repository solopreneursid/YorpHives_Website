# YorpHives Background Remover — model and runtime provenance

## Model
- Original project: U²-Net (Qin, Zhang, Huang, Dehghan, Zaiane, Jagersand), *Pattern Recognition*, 2020.
- Upstream source and complete license: https://github.com/xuebinqin/U-2-Net
- License: Apache License 2.0, including commercial use with attribution.
- Model: **u2netp**, small variant, ONNX model mirrored unmodified from Daniel Gatis's MIT-licensed `rembg` release.
- Original ONNX asset: https://github.com/danielgatis/rembg/releases/download/v0.0.0/u2netp.onnx
- Verified mirror: https://huggingface.co/edgetools/u2netp
- Bytes: **4,574,861**
- SHA-256: `309c8469258dda742793dce0ebea8e6dd393174f89934733ecc8b14c76f4ddd8`
- Input: float32 RGB CHW tensor [1,3,320,320] normalized with ImageNet mean/std.
- First output: float32 [1,1,320,320] saliency scores, scaled to 0–1 alpha mask.

## Inference engine
- ONNX Runtime Web `1.31.1`, MIT-licensed, sourced as a pinned npm build dependency.
- JavaScript, WebAssembly and the model are hosted on **YorpHives's own origin**. The page does not use any external runtime CDN or AI inference endpoint.
- Pinned integrity checks run at build time and in the browser before model initialization.
- WASM execution provider, single-thread mode; no WebGPU dependency, subscription, or third-party intermediary.
- Processing begins only after visitor interaction. Browser file data never gets uploaded.

## Release safeguards
- Keep the production branch unchanged until the real ONNX inference test, PNG output test, full UI flow, and mobile overflow checks pass.
- New tool uses a separate core module so model can be replaced with a better **permissively licensed** open-weight model later.
- Resource limits: source 10 MB / 12 megapixels, export max edge 1600 pixels, output max 20 MB.
- No promise of perfect matting: edges, wispy hair, translucent materials, overlapping subjects, and busy scenes may be inaccurate.
- The UI includes user-adjustable foreground threshold and feathering without rerunning model inference.
- Exported PNG re-renders the image and strips original camera EXIF metadata.

## Upgrade roadmap
1. Measure performance on physical Android phones and iPhones across Chrome, Firefox and Safari.
2. Benchmark a representative, rights-cleared photo set with manual edge-quality review.
3. Consider a separate optional higher-quality *commercially usable* open-weight model. Never silently download a 100+ MB model.
4. Keep model and engine versioned, swappable, checksummed, with a graceful fallback and no user file uploads.

This provenance file accompanies the source under `tools/models/`; the full Apache-2.0 license is at `tools/models/u2netp-APACHE-2.0-LICENSE.txt`.

## Optional portrait mode (v1.8.1)
- MODNet: *Trimap-Free Portrait Matting in Real Time*; original project: https://github.com/ZHKKKe/MODNet (Apache-2.0).
- Quantized ONNX export by Xenova: https://huggingface.co/Xenova/modnet (Apache-2.0 model card).
- Immutable conversion revision: `7e0f55f28727b43369531f75e0539ecc4912af82`, file `onnx/model_quantized.onnx`.
- Exactly **6,632,188 bytes**, SHA-256 `92e49898c3e05a6d7a944fc67a8cb87c4aad754ffb6ebd949528c7d1105fee3a`.
- Runtime weights are self-hosted in `/tools/models/modnet-int8-92e49898.onnx`; no image data or inference requests leave the browser.
- Browser preprocessing: RGB, CHW, 512×512, normalized into [-1,1]. Output alpha matte is used directly rather than min/max-stretched.
- Portrait mode is optional and targeted at people/hair; lightweight U²-Net-small remains default. Results vary with lighting and subject complexity.
- Both models run in ONNX Runtime Web's CPU WebAssembly execution provider; no paid AI service, GPU cloud compute, Pages Functions, Workers, subscription, or proprietary API.
- Cloudflare Pages static file requests are documented as free and unlimited. This does not guarantee that unrelated account services or a changed future pricing policy cannot generate charges.
- The optional model is downloaded to a visitor's device only after selecting Portrait and starting processing; no forced 6.6 MB download.
