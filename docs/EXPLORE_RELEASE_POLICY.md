# Explore: HQ-qualified product release policy

## Purpose
The homepage Explore showcase and Explore collection display **only** launched apps/products that have passed evidence-based HQ research and a separate founder sign-off. They are not a feed of raw agent suggestions.

The current catalog contains public free tools and **zero qualified applications**. The public site must communicate this clearly. Do not populate the collection with demos, fabricated customers, or unapproved ideas.

## Permanent authority boundary
- **Yorphives HQ (HQ)**: observes markets, collects evidence, analyzes market demand/competitors/customer problems, evaluates business viability, and recommends. HQ has no write, repository, deploy, production configuration or infrastructure permissions.
- **Founder**: reviews evidence, independently decides whether a candidate qualifies, and authorizes any product build and launch. Approval and release must happen through founder-controlled channels; HQ recommendations alone never trigger publication.
- **Website**: displays approved, launched products, but never accepts HQ-generated entries directly as trusted approvals.

## Qualify, then publish
1. **Market research passed**: a documented customer pain point, existing alternatives, plausible demand, user segment and competitive differentiation.
2. **Business analysis passed**: costs, revenue logic, distribution, regulatory/risk review, practical deliverability, and plausible value creation.
3. **Evidence available**: a founder-accessible review report stored outside the public catalog; the catalog records the report's SHA-256 hash, never private report content.
4. **Founder approves**: a separate explicit approval with a real date, followed by founder-executed publication of the product and its first-party page.
5. **Launch status**: the real product page must exist at the registered relative route; the publication record must be marked launched and published.
6. **Ongoing review**: HQ can recommend revisions, retirement or new opportunities but cannot silently deploy, delist or edit the website.

## Required catalog fields for apps and products
Each **actual** approved launch needs:
- `type`: `app` or `product` (free tools keep the existing tool policy).
- `name`, `description`, a real ISO date `date`, and a real relative first-party `url` such as `apps/product-name/`. The route's page must exist in source before release.
- `published: true` and `launchStatus: "launched"`.
- `headquartersReview: {status: "qualified", marketResearch: "passed", businessAnalysis: "passed", evidenceSha256: "<SHA-256 of reviewed evidence report>"}`, using the actual lowercase 64-character hex hash, never an invented digest.
- `founderApproval: {status: "approved", approvedOn: "<real YYYY-MM-DD approval date>"}`.
- No candidate should be described as HQ-qualified until these facts have been independently verified.

An app without all requirements is excluded from the public catalog, Explore page, carousel and SEO discovery. The build **fails closed** if an app is marked `published: true` without qualification, rather than publishing an unreviewed product.

## How the showcase operates
- Both homepage and Explore page are driven from the same local `catalog.json`; a shared `product-policy.mjs` enforces qualification.
- The **homepage** displays the two compact research and business qualification tiles followed by its own **Explore Spotlight** showing **one actual approved product at a time**, with the same first-party logo and product name presentation as the Explore page.
- **Both the homepage and Explore** use the same reusable carousel code, with independent timers. If two or more approved products exist, each card advances automatically **every 4.5 seconds**, with no click required.
- Previous, next and pause controls are optional. Rotation does not run in a background tab, when that page is hidden, or with reduced-motion enabled.
- With no approved products, the website truthfully displays the qualification checks plus **First launch pending**. It never invents applications or displays unreviewed product recommendations as launches.
- In public UI copy, use **Yorphives HQ / HQ** and refer to qualifying **products**, not “candidates”.
- Current content requires **no API, paid dependency or HQ-to-public write permission**.

## Explore spotlight autoplay and product logos
- The homepage spotlight and Explore page's compact right-side spotlight use the *same* approved catalog and shared renderer as the product collection. No individual product is hard-coded in the carousel.
- Once two or more founder-approved launches are published, the spotlight advances one product **every 4.5 seconds automatically** while the Explore section is visible. It shows **one product at a time**, wraps continuously, and slides the next card into view.
- The product's name and a first-party logo are shown. The optional `logo` catalog field is a first-party file such as `apps/product-name/logo.svg`, stored inside that product's source directory. Allowed formats: SVG, PNG, JPEG, and WebP. Remote/logo-as-a-service URLs are not loaded. Without a valid logo, the card shows the product's initials.
- The Previous, Next, and Pause controls are optional: visitors **do not need to click anything**. Autoplay pauses for reduced-motion preferences, hidden browser tabs and hidden views.
- Publishing a newly HQ-qualified and founder-approved product into the release catalog automatically makes it eligible for the rotation in the deployed build, without making a manual carousel edit.
- Until the first approved product is launched, the spotlight shows “First launch pending” and does **not** fabricate product names or run an empty animation.

## Important limitation
Catalog approval metadata and a SHA-256 digest are release safeguards, **not cryptographic proof** that research is correct or that the founder personally signed the record. The founder must independently validate the report, confirm the digest, and control who can change the release branch. The separate protected release process remains authoritative.
