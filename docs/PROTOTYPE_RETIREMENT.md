# YorpHives — prototype retirement audit

Date: 2026-11-15 (Asia/Kolkata)

The founder confirmed that the first `YorpHives` website was an expendable prototype and authorized deleting unnecessary prototype infrastructure after V1.0 launched.

## Deleted / retired (verified through Cloudflare)

- Old Cloudflare Pages project **`yorphives`** with its prototype-only Pages Functions and deployments. It had no active custom domains after launch.
- Legacy Worker **`yorphives-processing-api`**, unused by the new browser-local tools and not bound into the Headquarters Worker.
- Custom Worker hostname and old Cloudflare DNS record for `api.yorphives.com`; detaching the Worker domain automatically removed the matching synthetic AAAA DNS record.
- Prototype Durable Object namespace **`yorphives-processing-api_PdfProcessor`**, which disappeared after the Worker deletion.
- The obsolete draft GitHub PR **#1** was closed, **not merged**.

## Replaced before deletion

- Production release **RC6**, branch `release/v1.0-rc6`, pinned at commit `6ef7f94346248d1444e4f0bd8e538361cd821c1a`.
- Three cross-domain redirects from old File Studio, Grayscale, and Split PDF URLs now lead to the new first-party `/tools/` directory (not a purported equivalent tool). The other 20 old aliases still point to first-party replacement pages. There are 23 total rules.
- The RC6 build passed **136 Node tests, zero failures** in both production and preview modes. All 92 individual tools and 94 canonical sitemap URLs remain unchanged. `yorphives.com`, direct tools, and older link redirects were checked after deployment.

## Preserve — these are NOT junk

- Production Cloudflare Pages project **`yorphives-v1-live`**, connected to `solopreneursid/YorpHives_Website` `release/v1.0-rc6`. Automatic production redeployments are disabled. Older release history including RC5 remains available for code-level rollback.
- Testing Cloudflare Pages project **`yorphives-v1-review`**, connected to the development branch. It is the required noindex staging/QA facility for future releases.
- Headquarters Worker **`yorphives-hq-free-pilot`**, including its D1 binding, and the repository `YorHives_Headquarters`.
- R2 bucket **`yorphives-processing-temp`** (name is historical but misleading): it contains **five Headquarters staging backup/migration objects**. **Do not delete this bucket** or those objects just because the processing Worker was retired. Move to a dedicated HQ bucket only under a separately verified backup-migration plan.
- Existing email-routing DNS records (MX, SPF, DKIM, and DMARC) and Cloudflare domain/DNS configuration.
- Live `yorphives.com` and `www.yorphives.com` CNAMEs point to `yorphives-v1-live.pages.dev`; both custom domains reported active validation after cleanup.

## Operating rules

1. The deployed Headquarters team remains observation, research and recommendations only. Never grant it write/deploy/domain permissions.
2. Do not delete `yorphives-v1-review` as it is the quality gate for future tool releases.
3. Do not treat temporary/sounding resource names as sufficient evidence for deletion. Inspect bindings and actual data first.
4. Before subsequent production changes, deploy to staging, verify all affected URLs, and obtain founder approval for public release.
5. No manual GitHub merge from the old closed PR is required for production. The real release source is the pinned `release/v1.0-rc6` branch.
