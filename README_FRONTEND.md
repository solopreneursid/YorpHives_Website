# YorpHives — public front-end export

Export of first-party public front-end sources associated with the production release (32e419417f458da8c460e2391eada56590d6a177).

**Actual reimagined design:** open `reimagined/index.html`. The stylesheet and JavaScript beside it (`studio.css`, `rotators.css`, `studio.js`, `rotators.js`) power the visual design matching the live site screenshot. `tools/` contains the source for the public utility pages and assets. `catalog.json` contains the source catalog.

### Run locally

From the extracted archive root, run `python3 -m http.server 8000` and open `http://localhost:8000/reimagined/`.

This is a **frontend source snapshot**, not a byte-for-byte mirror of Cloudflare's built `dist/`. Browser-local tools may require production-built dependencies/assets. Public analytics require network access; no backend, Cloudflare functions, configuration, credentials, or databases are bundled. Production was not modified.
