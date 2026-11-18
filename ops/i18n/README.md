# YorpHives future-proof localization (public website)

This workflow is **local-first**, not a paid external translation subscription. It
protects English originals, tool inputs, user documents and generated results.

## Already wired to every website build

- The original 143 published tools remain accessible while their historical
  descriptions receive human review. Their existing English copy is frozen in
  `catalog-localization-baseline.json`.
- **Any new tool or founder-approved venture, and any modification to an old
  tool's name or description, fails the public build** unless it has approved
  `localizations` for all seven website languages.
- The build generates `site-catalog-copy.mjs` from eligible, reviewed catalog
  fields. This is automatically imported by the existing browser language
  switcher, including in new product cards and newly created catalog pages.
- The build generates `i18n-coverage.json`, a machine-readable report of
  the unlocalized existing catalog entries. It does **not** expose private HQ
  data or user content.
- Newly added *static marketing copy* in `reimagined/index.html` is checked
  against `marketing-copy-baseline.json`; new phrases must have translations
  in the page/section/tool language packs. This guards future section changes.
- Existing site sections, shared tool controls and the 16 catalog categories
  already have first-party translation packs.

## Format for every future catalog product

Add a `localizations` object to the catalog entry using the same keys as
`PUBLIC_LOCALES` in `catalog-localization.mjs`, for example:

```json
"localizations": {
  "hi": {
    "name": "स्थानीयकृत उत्पाद नाम",
    "description": "उत्पाद का उपयोगी स्थानीयकृत विवरण।",
    "reviewed": true,
    "reviewedOn": "2026-11-18"
  }
}
```

Repeat for `es`, `fr`, `de`, `pt`, `ar`, and `ja`.
Use `reviewed:true` **only after human/founder-authorized review**, never
as a default. The founder still approves launches separately through the
existing product policy.

## Optional private model for translation drafts

Without a model installed, you can always generate a worklist:

```bash
node scripts/i18n-drafts.mjs
```

When a self-hosted **LibreTranslate-compatible** service (e.g. LibreTranslate
backed by open-source Argos Translate models) is running on your own machine,
you can request suggested translations **locally**:

```bash
YORPHIVES_LOCAL_TRANSLATOR_URL=http://127.0.0.1:5000/translate node scripts/i18n-drafts.mjs --translate
```

Both modes write `ops/i18n/translation-review.json`. Machine-generated
suggestions stay **unapproved**; they are not inserted into `catalog.json` or
published automatically. Only loopback HTTP is permitted. There is no
automatic external upload, API subscription, or cloud translation vendor.

## New feature checklist

For new homepage and section phrases, add all seven versions to the
first-party packs and keep the existing build guard enabled. New product
names/descriptions use the catalog `localizations` fields. Existing tools
with changed names/descriptions follow the same rule.

Brand-new **dynamic JavaScript-only** copy and individual specialized tool
instructions are not guaranteed to be translated by the static HTML guard.
They must be added to the shared language packs, tested, and reviewed.
Never claim automatic full-page translation without a running and verified
self-hosted model. Keep English as the safe fallback.
