# Third-party components

These files are served locally; none uses a CDN or a remote processing API.

- `qrcode-generator.mjs` and `qrcode-utf8.mjs` are from [Kazuhiko Arase's QR Code Generator](https://github.com/kazuhikoarase/qrcode-generator) at commit `83b7e8fe3fddd3b0368dbafd6ce56995bd25e3c8`, MIT licensed. The copyright and full terms are in `qrcode-LICENSE.txt`.
- `marked.mjs` is Marked `17.0.5` from [markedjs/marked](https://github.com/markedjs/marked), MIT licensed. The copyright and full terms are in `marked-LICENSE.md`. Marked converts Markdown to HTML; its output is not sanitized and must not be inserted into a page without sanitization.
- `pdf-lib.mjs` is the bundled ES module for [pdf-lib](https://github.com/Hopding/pdf-lib) `1.17.1`, MIT licensed.
- `pptxgen.bundle.js` is the browser bundle for [PptxGenJS](https://github.com/gitbrent/PptxGenJS) `4.0.1`, MIT licensed; it includes JSZip.
- `jszip.mjs` wraps the browser bundle for [JSZip](https://github.com/Stuk/jszip) `3.10.1` as an ES module. It is distributed under the MIT option of its dual license and is used to create XLSX files.
- License files for these packages and bundled dependencies are in `licenses/`. The file-tool runtime loads each library locally only when a tool needs it.

## Wave 1 additional local browser engines (2026-11-15)

The site does **not** load scripts or submit files to external processing services at runtime. Pinned packages from `package.json` are installed at build time, then the required browser files are copied to `dist/tools/vendor/`. They are downloaded only when the related tool is opened.

- **Mozilla PDF.js / pdfjs-dist 6.5.438**, Apache-2.0: PDF page rasterization and selectable-text extraction. The PDF renderer and its dedicated worker are kept together.
- **Tesseract.js 7.0.0** and **tesseract.js-core 7.0.0**, Apache-2.0: English OCR using WebAssembly and a self-hosted worker. The **@tesseract.js-data/eng 1.0.0** language data is also hosted locally.
- **jsQR 1.4.0**, Apache-2.0: decoding QR codes from local image pixels.
- **JsBarcode 3.12.3**, MIT: generating printable Code 128, Code 39 and EAN-13 SVG barcodes.
- PDF editing and invoice generation reuse the existing MIT-licensed pdf-lib library. Do not represent typed PDF signatures as cryptographic signatures.
- No recurring paid API, remote OCR inference, or external conversion backend is required. The npm registry is a build-time source; no third-party requests are made by these tools at runtime.
- Re-evaluate browser and WebAssembly compatibility and package licenses before updating pinned dependencies. Maintain relevant attribution and original licenses when distributing dependency assets.
