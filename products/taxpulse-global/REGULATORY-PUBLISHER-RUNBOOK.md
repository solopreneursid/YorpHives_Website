# Regulatory publisher operations (preview only)

The monitoring Worker discovers candidate changes. The separate publisher validates signed packages and advances the D1 head using a compare-and-swap. No production rule or website release permission is granted.

## Enrollment prerequisites
- Confirm the exact deployed calculator engine fingerprint and matching publisher revision.
- Appoint an independent statutory reviewer and a trusted rule publisher. The reviewer must inspect original legal sources, effective periods, jurisdiction, eligibility, dependent calculations and independently derived expected fixtures. Synthetic CI evidence is never a statutory approval.
- On the trusted publisher's controlled offline system, run `node scripts/generate-rule-signing-key.mjs /absolute/path/to/new-private-directory`. Keep private.pem offline with restricted permissions and backups; never commit, upload to the monitor, or paste into chat. Share only public.json.
- Use the reviewed schema-v2 payload (regional, India salary, payroll and national/investment registries), per-component evidence and fixtures. Sign with scripts/sign-preview-rules.mjs. The signature proves publisher identity and integrity, not legality.
- Enroll the same public key on the preview publisher and runtime; enable the publisher schedule only after enrollment. The publisher reads RULE_INBOX and writes RULE_DB; preview reads RULE_DB, RULE_PUBLIC_KEY and RULE_MIN_SEQUENCE. Do not bind the preview runtime to an empty head: this intentionally blocks statutory calculation.
- Verify the first approved package in the private publisher, confirm D1 head, exact engine fingerprint and hosted smoke results, then bind the reader. Reissue signed snapshots before their expiry; otherwise the runtime fails closed.
- Emergency restriction advances the head sequence and retains evidence. Recovery requires a newly signed higher sequence, not replay of an old envelope. Keep previous Worker versions and D1 history. Key rotation requires coordinated public key and publisher enrollment.
- Schema v1 snapshots cannot activate with v2. Historical catalog is independently bundled; the 2026 national registry supports only the currently modeled period and shape. Unmigrated legacy country calculations are blocked in signed mode.

## Staging verification
The hosted preview check is a separate read-only GitHub Actions workflow triggered by data/hosted-preview-check.json changes; pin the expected deployment revision, monitoring source count and runtime state. A CI test of the local bundle does not by itself establish that the hosted revision works. Never label a failed or unexecuted hosted check as passed.

## Current status
No trusted public key has been enrolled and no independently approved package has been published. The D1 head remains empty and the publisher schedule must remain disabled. The existing production release gate remains closed. 
