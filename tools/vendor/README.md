# Third-party components

These files are served locally; none uses a CDN or a remote processing API.

- `qrcode-generator.mjs` and `qrcode-utf8.mjs` are from [Kazuhiko Arase's QR Code Generator](https://github.com/kazuhikoarase/qrcode-generator) at commit `83b7e8fe3fddd3b0368dbafd6ce56995bd25e3c8`, MIT licensed. The copyright and full terms are in `qrcode-LICENSE.txt`.
- `marked.mjs` is Marked `17.0.5` from [markedjs/marked](https://github.com/markedjs/marked), MIT licensed. The copyright and full terms are in `marked-LICENSE.md`. Marked converts Markdown to HTML; its output is not sanitized and must not be inserted into a page without sanitization.
- `pdf-lib.mjs` is the bundled ES module for [pdf-lib](https://github.com/Hopding/pdf-lib) `1.17.1`, MIT licensed.
- `pptxgen.bundle.js` is the browser bundle for [PptxGenJS](https://github.com/gitbrent/PptxGenJS) `4.0.1`, MIT licensed; it includes JSZip.
- `jszip.mjs` wraps the browser bundle for [JSZip](https://github.com/Stuk/jszip) `3.10.1` as an ES module. It is distributed under the MIT option of its dual license and is used to create XLSX files.
- License files for these packages and bundled dependencies are in `licenses/`. The file-tool runtime loads each library locally only when a tool needs it.
