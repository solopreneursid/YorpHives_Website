# YorpHives production release — Workers (not Pages)

## Architecture confirmed 2026-11-24

Canonical visitor traffic to `yorphives.com/*` is served by Cloudflare Worker `yorphives-edge-static-live` (zone route `efde34f924b84583a40bf0777b996658`). The `yorphives-v1-live` Pages project is a retained fallback and must **not** be treated as the currently active website. The domain root and `ads.txt` have separate `yorphives-adsense-verify-home` routes. Do not delete or rewrite those routes.

The previous Pages-only production promotion uploaded an intact artifact but its live-domain identity check could not pass: the apex continued to serve the Worker asset version. This was a deployment target mismatch, not proof that the tested artifact was corrupt. See issue #103.

## Current approved release

- Source SHA: `f98207dc98a3b109d0f2bb27b524ad3ab809d0e4`
- Asset fingerprint: `ee121b41b3ab814870e1829cd27b5d2db75d48689704aa2057daa85543ec96b4`
- Green readiness run: `45201553389`
- Workers no-deployment preflight: `45300194455`; exact 474 assets verified, production bindings checked, Wrangler dry-run passed.

## Correct deployment procedure

1. Confirm the protected GitHub environment `yorphives-production` requires the account `solopreneursid` to review deployments.
2. Ensure GitHub Actions secret `CLOUDFLARE_API_TOKEN` is authorized for the YorpHives account to deploy and inspect **Workers Scripts**, not only Cloudflare Pages. Use the minimum permissions sufficient for the existing Worker script and deployment API; never paste the token into issues or logs.
3. Use GitHub Actions workflow `.github/workflows/workers-production-promotion.yml` on `main`, **not** `production-promotion.yml` (the obsolete Pages-only workflow).
4. Supply the readiness run ID, source SHA, fingerprint above, and the explicit founder approval phrase `PUBLISH_YORPHIVES_NOW`. Review the `yorphives-production` environment approval in GitHub.
5. The workflow verifies the exact immutable candidate, the production Worker configuration, the prior active Worker version, then uploads the same previously tested assets via `edge/live/wrangler.jsonc`. It checks the actual apex release manifest, every published public tool route, and the Worker health endpoint. On post-upload failure it attempts to restore the previous Worker deployment version automatically.
6. Verify the GitHub Actions job is green and actual `https://yorphives.com/.well-known/yorphives-release.json` has the approved `sourceSha` and `assetFingerprint`. Do not declare success on a Pages version-specific URL alone.

## Retained recovery controls

- Keep Cloudflare Worker route `yorphives.com/*` and production D1 bindings `INSIGHTS_DB`, `HQCONNECT_DB`, four rate-limit bindings, and analytics dataset intact.
- Keep the `yorphives-v1-live` Pages project untouched as a fallback, not an active release target.
- If Worker verification fails and rollback does not complete, investigate Worker deployments and restore the last known-good version through the approved deployment API. Never delete the Worker route as an automatic reaction to a static asset mismatch.
- HQ monitoring and recommendation agents remain read-only. Founder GitHub Actions with protected environment and scoped token are the production executor.
