# Builders — paid membership and private jobs

## Founder-approved product policy

Builders is a **paid, members-only job and project network** for developers, creators, freelancers, founders, individuals, small and large businesses, companies, schools, colleges, nonprofits, government organizations, and other lawful participants.

**Public visitors may read about membership and Builder Partners. They must not browse jobs, see applicant/member details, apply, or post jobs.** Both sides of the marketplace pay to join. The actual pricing and payment method remain undecided; no purchase button or invoice is allowed until configured and verified.

Trusted long-term members can separately qualify for **Builder Partner** status through founder-led review. Partner status may offer priority consideration and additional benefits, but never exempts a member from the active paid entitlement or verification requirements unless the founder establishes a documented exception policy.

## Current launch state (frontend preview only)

- Public Home Builders section and public Builders information page are complete as visual previews. The Home section uses dark **forest teal** (deep blue-green) rather than black, with accessible mint-on-dark cards.
- Builders public-page clarity pass (2026-11-19): distinct Find Work / Hire Builders routes, a four-step future member journey, accessible mobile layouts, and an explicit no-payment/no-application launch notice. All links remain informational; they do **not** grant access.
- The previous unauthenticated job-posting email form was **removed**. No job listings, job details, applications, candidate data, paid-member records, or posting endpoints exist on the public static website.
- Public navigation to `#builders` is informational. An old `#post` link is redirected to the membership explanation rather than a form.
- **Paid enrollment is not live.** The preview must not claim that memberships are active, payments can be taken, or members can currently see jobs.
- The static release check must fail if someone reintroduces public job form/listing markup. This is a temporary safety safeguard, **not** a substitute for backend authorization.

## Required server-side implementation (before opening paid membership)

**Deployment boundary:** A separately deployed, self-hosted Builders service owned by YorpHives; the static marketing site is a public client and holds **no job or member data**. Portability takes priority: Node.js, SQLite (WAL plus backups), server-rendered pages/HTML or same-origin JSON endpoints, plain documented HTTP interfaces, provider-neutral deployment. Do not rely on Cloudflare-specific APIs for core entitlement checks.

1. **Identity & login:** Verified accounts, salted Argon2id password hashes or passkeys, secure same-site HTTP-only cookies, session rotation, reauthentication for sensitive actions, account recovery under founder control. Rate-limit login, invitations and posts. Never place privileged tokens in browser storage.
2. **Payment & active entitlement:** Record a founder-approved membership plan, real payment or settlement verification, expiry and renewal history in the private database. Only a server-side `status=active` entitlement unlocks access. Pending, failed, expired, chargeback, or unverified payments are denied. Do not infer payment from return URL or client-side flags. A payment adapter may change without modifying the jobs or identity modules; no plan price is assumed here.
3. **Job visibility:** Authorize each authenticated request to `GET /member/jobs`, individual jobs and attachments before loading private data. No public caching, sitemap, indexable listing, embedded job JSON, public R2 bucket, or crawler feed. Exclude even job titles from unauthorized responses.
4. **Posting:** Require active paid entitlement on every create, edit, submit or publish request; CSRF defense; schema checks; abuse/rate limits; file scanning if uploads are introduced; publication review and moderation. Organization members also require an authorized organization role.
5. **Applications and messages:** Only verified paid members may apply or communicate through member channels. Access to an application is limited to its applicant, the job poster's authorized organization members, and audited moderators.
6. **Builder Partners:** Separate trust review and approval record with reviewer/date/evidence; reversible partner flag; partner privileges checked per request. No automatic status based only on spend, subscription duration, or AI scores. Clear expectations and review/revocation rules.
7. **Organizations:** Support legal entities and invited team members without sharing personal credentials. Keep organization and personal identities separate; record who can spend, post, review applicants, or cancel membership.
8. **Security & recovery:** Private append-only audit events for payment adjustments, job posts, approvals, disputes and partner changes; offsite encrypted backups with restore drills; private attachments with short-lived authorized delivery; data retention, account deletion and reporting controls.
9. **Governance:** Yorphives HQ may research and **recommend** improvements and market opportunities, but cannot write jobs, grant paid entitlements, approve partners, deploy code or manipulate payments. The founder and explicitly authorized humans retain execution rights.

## Release gates

- A release test confirms public static assets contain **no** job titles, paid-member data, member APIs, preview example jobs, or functional posting forms.
- End-to-end authorization tests cover anonymous, unpaid, active, expired, revoked, and partner accounts on **every** private endpoint. A private job URL copied into an incognito window must be denied before data access.
- Paid onboarding requires a real price, billing/renewal/cancellation/refund policy, terms, privacy policy, and founder-approved collection method.
- Run a paid-entitlement simulation on staging and separately audit that a client cannot forge access.
- Only after passing the preceding gates may the founder enable the paid portal in production. **Until then, do not expose any jobs or posting capability.**
