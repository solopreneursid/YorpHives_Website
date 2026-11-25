# TaxPulse Global — HQventures

Development only. Original prototype: reference/original-prototype.html.txt. Do not serve this reference publicly as executable HTML.

Retain all 38 modules and eight jurisdictions. Tax laws must be verified against official sources before activation. No simulated payment, SSO, document processing or cryptographic verification may be advertised as operational.

## Release gates
- Complete original engine migration and verify source provenance.
- Verify each country/year/module rule against authoritative sources and independent expected results.
- Test UI/API/MCP parity, input validation, privacy, access controls, payment verification, rollback and browser accessibility.
- Keep staging separate from production. No production routes or automatic production deployment until gates pass.
- HQ monitoring remains read-only.

Existing hosted previews are experimental and not suitable for financial decisions.

## Current isolated development status (2026-11-25)

- The original 38-module frontend remains intact; production is not enabled.
- Seven sample country/API calculation modules are available for IN, US, and GB only. The other five country fixtures remain excluded from the API as unverified.
- Independent US federal single-filer and UK England/Wales/NI ordinary-income vectors live in `tests/official-pit-vectors.test.mjs`. Scope and official references are recorded in `rules/evidence/pit-independent-vectors-2026-11-25.json`. Passing them does not certify either country or any whole module.
- The production release gate now requires actual backend country support and official-source evidence for every required module, not merely verified flags.
- Local-only encrypted record storage is implemented in `engine/browser-vault.mjs`, backed by `engine/secure-records.mjs`, and packaged as preview browser assets. It is not yet wired into the user-facing save/open workflow.
- The simulated Pro checkout trigger is disabled in the isolated prototype frontend.
- The staging workflow runs `node --test products/taxpulse-global/tests/*.test.mjs` on branch updates.

## Local encrypted record contract

Use `openEncryptedVault()` in a supported secure browser to open a device-local IndexedDB vault, then `save(record, passphrase)`, `list()`, `read(id, passphrase)`, `remove(id)` and `close()`. Only AES-256-GCM encrypted envelopes and opaque record identifiers are stored; the passphrase is neither stored nor uploaded. Record limits, browser eviction, private browsing, lost passwords, accessibility and real-browser testing remain deployment considerations. This module is not an account-sync service or a recovery system.

## Remaining hard blockers

Full official tax-rule review for all eight jurisdictions and required modules; independent browser/end-to-end tests; authentication and access-control review; secure record UI and backup/recovery experience; privacy and financial-data handling review; reliable document ingestion; honest AI and payment integration; final release/rollback testing. Maintain noindex and preview-only disclaimers until these gates are cleared.
