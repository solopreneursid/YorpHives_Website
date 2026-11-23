# HEIC decoder provenance and license

YorpHives' HEIC-to-JPG tool converts files locally in the visitor's browser; no input image is uploaded or sent to a third-party API.

- Decoder: `heic-to` version **1.5.2**, including its bundled libheif/libde265 components.
- Original source: https://github.com/hoppergee/heic-to/tree/v1.5.2
- License: **LGPL-3.0**. The upstream license is copied to the built website at `/tools/vendor/wave1-licenses/heic-to-LICENSE.txt`.
- Distribution: one standalone, replaceable, same-origin ES module at `/tools/vendor/heic/heic-to.mjs`, built from `node_modules/heic-to/dist/csp/heic-to.js` using the repository's locked npm dependency graph. This avoids CDN calls and uses the upstream CSP-compatible build.
- Pinning: `package.json` and `package-lock.json` specify the exact library version and tarball integrity.
- Fallback: browsers with native HEIC support may decode directly before the local library is loaded.

The library and its bundled codec dependencies are provided under their own license terms. Keep the separate module, upstream source link, version information and license text when modifying or replacing it.

A representative synthetic HEIC conversion is checked in CI without deployment by intercepting only the tool module and decoder asset in a read-only browser session. A passing scenario is not a guarantee of support for every modern iPhone HEIC variant or every browser.
