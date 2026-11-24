# YorpHives production release — Workers (not Pages)

## Architecture confirmed 2026-11-24

Canonical visitor traffic to `yorphives.com/*` is served by Cloudflare Worker `yorphives-edge-static-live` (zone route `efde34f924b84583a40bf0777b996658`). The `yorphives-v1-live` Pages project is a retained fallback and must **not** be treated as the currently active website. The domain root and `ads.txt` have separate `yorphives-adsense-verify-home` routes. Do not delete or rewrite those routes.

The previous Pages-only production promotion uploaded an intact artifact but its live-domain identity check could not pass: the apex continued to serve the Worker asset version. This was a deployment target mismatch, not proof that the tested artifact was corrupt. See issue #103.

## Current live release (verified 2026-11-24)

- Source SHA: `08c982fc025e3836992b9c2b7cde63b3db16927f`
- Asset fingerprint: `c50f9a82fbff79d8130238af50594ff7ae738d6d16dc367b68616aed5977431b`
- Active Worker version: `04c14ac9-9152-494b-8bcf-c6a097716938`
- Full privacy, tool, browser and accessibility audit: GitHub Actions run `45411737136`.
- Pinned publication and live route verification: run `45412890285`.
- Live consent verification with synthetic, intercepted analytics: run `45413115307`.
- The source branch `release/yorphives-reimagined-20261116` points to the same website revision.
- The privacy notice and worldwide analytics opt-in are active. The analytics retention routine was verified on 2026-11-24.

The prior verified release was source `4800e2e56e89a4080600e2d74ecb70dda1810310`, fingerprint `112cde8382a413b97052f6336ddc6ceaaa47720748a8ee3fff819c93c84fef64`, Worker version `23b5c772-7d54-46e6-9480-cdb40c8f87e5`.

**Automatic Cloudflare deployment is paused:** Workers Builds may still build and test the production branch, but its deploy command is currently an informational `echo` and must not be changed back to an unreviewed `wrangler deploy`. This preserves the Git integration and settings while preventing a branch push from replacing the verified Worker. The Pages fallback remains untouched.

The standard `yorphives-production` GitHub environment currently has no saved required-reviewer rule. The protected promotion workflow deliberately refuses releases until that control is restored. The green official readiness run `45413794425` verified and packaged this exact source. The promotion workflow pins that run and artifact; update its pins only after a future successful readiness run. The previous readiness run `45352696214` describes the prior source.

## Correct deployment procedure

1. Restore and verify the protected GitHub environment `yorphives-production` required-reviewer rule for account `solopreneursid` before using the standard protected promotion workflow.
2. Ensure GitHub Actions secret `CLOUDFLARE_API_TOKEN` is authorized for the YorpHives account to deploy and inspect **Workers Scripts**, not only Cloudflare Pages. Use the minimum permissions sufficient for the existing Worker script and deployment API; never paste the token into issues or logs.
3. Use GitHub Actions workflow `.github/workflows/workers-production-promotion.yml` on `main`, **not** `production-promotion.yml` (the obsolete Pages-only workflow).
4. Update the workflow's exact identity pins from a successful current readiness run, then supply its run ID, source SHA, fingerprint, and the explicit founder approval phrase `PUBLISH_YORPHIVES_NOW`. Review the `yorphives-production` environment approval in GitHub.
5. The workflow verifies the exact immutable candidate, the production Worker configuration, the prior active Worker version, then uploads the same previously tested assets via `edge/live/wrangler.jsonc`. It checks the actual apex release manifest, every published public tool route, and the Worker health endpoint. On post-upload failure it attempts to restore the previous Worker deployment version automatically.
6. Verify the GitHub Actions job is green and actual `https://yorphives.com/.well-known/yorphives-release.json` has the approved `sourceSha` and `assetFingerprint`. Do not declare success on a Pages version-specific URL alone.

## Retained recovery controls

- Keep Cloudflare Worker route `yorphives.com/*` and production D1 bindings `INSIGHTS_DB`, `HQCONNECT_DB`, four rate-limit bindings, and analytics dataset intact.
- Keep the `yorphives-v1-live` Pages project untouched as a fallback, not an active release target.
- If Worker verification fails and rollback does not complete, investigate Worker deployments and restore the last known-good version through the approved deployment API. Never delete the Worker route as an automatic reaction to a static asset mismatch.
- HQ monitoring and recommendation agents remain read-only. Founder GitHub Actions with protected environment and scoped token are the production executor.
