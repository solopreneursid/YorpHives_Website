# YorpHives universal tool-first discovery

**Principle:** Every published page that represents a useful tool, application, product or service has its own permanent, server-rendered URL that opens the requested item directly. The studio homepage remains a separate brand identity. Organic search visitors and autonomous agents must never need to visit the homepage before reaching the tool or application.

## One publishing contract for future products

Register each public offering in `catalog.json` under `items` using a unique URL, descriptive `name`, honest and useful `description`, and a `type` such as `tool`, `app`, `product`, `service`, or `page`. URLs are safe relative paths such as `tools/word-counter/` or `apps/my-product/`; a static `index.html` must exist under the path. An explicit `published: false` or `visibility: "private"` prevents discovery markup and sitemap inclusion. The public catalog itself should not contain confidential or draft records; keep private content outside of the public static file tree.

Run the static publishing script:

```sh
node scripts/build-site.mjs --target=preview
node --test tests/*.test.mjs
node scripts/release-check.mjs dist
```

The publisher creates `dist/` from approved public files only. Each registered offering gets a self-referencing, absolute canonical URL under `yorphives.com`, an Open Graph URL, JSON-LD WebPage + breadcrumb + a relevant app/product/service entity, and a unique direct URL in the sitemap. Free-tool pricing is reported as zero; prices for future apps/products must be explicitly provided, never assumed. It also generates directory metadata if an index page exists. Descriptions, limitations, examples, and instructions should be human-useful and specific to the individual offering, not generic SEO filler.

## Preview versus production

- `--target=preview`: preview-only `X-Robots-Tag: noindex, nofollow` on every asset, plus a robots file that permits crawling so robots can see that header. Canonical tags still refer to the future live domain. Keep the review deployment on the `.pages.dev` subdomain, not the main domain.
- `--target=production`: indexable canonical pages and sitemap for `https://yorphives.com/`. Never attach a public domain or deploy a production build before approval. The real `yorphives.com` project currently points to another GitHub repository.
- Do not use `robots.txt Disallow: /` as the only way to hide previews; blocked URLs may still appear in search without crawled content.
- No external SEO SaaS, paid APIs or third-party processing service is required. Submit the live sitemap to Google Search Console once the domain serves all tools.

## AI agents and open interoperability

`/catalog.json` remains the machine-readable directory containing canonical relative URL, descriptions and, for browser-local tools, JavaScript module descriptions and structured inputs. `/llms.txt` points agents toward these resources. JSON-LD appears directly in HTML without requiring JavaScript execution. This is provider-neutral and does not pretend that a catalog or JavaScript module is a remotely executable API. Do not claim adherence to an interoperability standard unless validated against that standard.

## Search quality and launch gate

Verify pages have meaningful visible headings, independent access, usable interfaces, clear limits and accurate outputs. Verify structured data in Google's Rich Results Test and real indexing with Google Search Console after publication. Sitemap inclusion and structured data do not guarantee ranking or indexing. Do not create thousands of thin or near-duplicate pages just to target search queries. Release remains founder-controlled.
