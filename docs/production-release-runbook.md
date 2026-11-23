# YorpHives founder-controlled production release and recovery

## Live deployment inventory (confirmed from Cloudflare)

- Live Cloudflare Pages project: `yorphives-v1-live` on the existing Cloudflare account.
- Domains: `yorphives.com`, `www.yorphives.com`, `yorphives-v1-live.pages.dev`.
- Git-connected production branch: `release/yorphives-reimagined-20261116`.
- **Automatic production Git deployments: disabled** on 2026-11-23 to stop unreviewed source commits from publishing.
- The last successful production deployment observed while establishing the controls was ID `ab94a0ad-95f4-4e51-9ea3-fb0471874bc8`, source commit `c629c99e19d9e94e063e909ae0ca28a2fc7b4619`. Reconfirm the currently live deployment before recovery; this is historical evidence, not a permanent rollback recommendation.
- The separate project `yorphives-v1-review` is not the live domain and must not be used as the production destination.

## Workflow and authority

1. **Prepare an immutable candidate** via `.github/workflows/release-readiness.yml` on `main`. It checks out a specific source SHA, checks npm advisories, builds the *production* artifact, runs source/release tests, then separately builds and validates a noindex preview. No deployment occurs.
2. **Read the successful workflow evidence.** Record its source SHA, the full artifact fingerprint from `candidate-manifest.json`, and the exact readiness workflow run ID. The candidate archive is retained for 14 days. Failed builds must never be promoted.
3. **Founder approval only.** `.github/workflows/production-promotion.yml` requires manual invocation, `PUBLISH_YORPHIVES_NOW`, the exact approved SHA and fingerprint, and the readiness run ID. Use a GitHub Environment named `yorphives-production` with *required reviewer approval* and restricted deployment branches. The literal phrase is a second check, **not a substitute for an actual protected environment**.
4. **Least-privilege credential.** Configure the `CLOUDFLARE_API_TOKEN` secret in the protected GitHub environment; it must have only the Pages permissions needed for this project. The Cloudflare account and live Pages project are pinned in the workflows and checked for the canonical domain before any upload.
5. **Promotion does not rebuild.** It downloads the approved archive, verifies each file hash and the source SHA, checks project ownership, then uploads the approved static files with version-matched Pages Functions from the same SHA.
6. **Post-deployment gate.** `scripts/release-verify.mjs` verifies `/.well-known/yorphives-release.json` and byte hashes for homepage, tools directory, catalog and sitemap on `https://yorphives.com`. The release must not be declared successful without this check.
7. **Continuous drift monitoring.** `.github/workflows/live-release-integrity.yml` checks the live release marker and critical bytes twice daily; missing marker before the first approved release is recorded as pending activation, not proof of a site outage.
8. **Rollback.** If critical live checks fail, use `.github/workflows/production-rollback.yml` manually with a previous **successful production** deployment ID and `ROLLBACK_YORPHIVES_NOW`. Recheck live routes and open a follow-up incident. Restoring Pages assets **does not restore D1/KV or external state**.

## Important limitations

- The 143/143 QA result covers defined *representative* tests on source/browser paths, **not full proof of the specific live deployment**.
- Cross-browser preview smoke is provided by `.github/workflows/cross-browser-preview.yml`; more edge cases, mobile touch testing, real-user error collection and accessibility auditing remain ongoing work.
- The existing YorpHivesHQ employees have observation, analysis and recommendation privileges only; no autonomous source change, production deployment or credential access.
- The static manifest records every built asset's SHA-256. Remote verification fetches critical public assets; it cannot by itself attest a hidden Cloudflare Functions bundle or server database state. Preserve the exact source commit and deployment ID for those.
- The old review Pages project's build command builds production then preview in the same directory. Do not use that mixed artifact for production promotion.
- Do not re-enable auto Git production deployments without replacing the founder approval boundary with an equally strict mechanism.
