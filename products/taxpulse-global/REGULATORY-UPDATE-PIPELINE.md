# Regulatory update pipeline — preview implementation
Status: partial; no production authorization.

## Boundaries
Government publication discovery is not legal certification. The scheduled monitor has read-only external access and writes evidence to its own KV. It must not hold the publisher's signing key, deployment permissions or website repository write credentials. New law, conflicting sources, proposed legislation, mid-period transitions and unmigrated components are review cases, not automatic patches.

## Dynamic rule data
Regional schedules (17 scopes) and India ordinary salary regimes are JSON version registries. Context is passed explicitly through affected salary/offer/reverse/compensation/international/CTC/India comparison calculations and receipts. Existing unconverted statutory components (including legacy personal income tax, capital gains, national assessment and contribution rules) are not globally updated. Full-period model rejects partial-year transitions. The current UI offers the existing tax periods only.

## Runtime preview distribution
The integrated Worker accepts optional RULE_SNAPSHOTS (KV binding), RULE_PUBLIC_KEY (Ed25519 raw 32-byte hex), RULE_MIN_SEQUENCE (trusted positive decimal sequence floor). Without any of these the preview uses bundled unverified data. Partial configuration, missing object, expired, incompatible, malformed or bad-signature snapshot blocks calculation instead of silently reverting. The active-preview KV record is a signed envelope; see engine/rule-snapshot.mjs for canonical serialization and schema. Evidence digests and signatures authenticate a publisher's records, not statutory accuracy. Trusted approval must independently inspect original government publication, effective dates, jurisdiction, eligibility, dependent formulas and test fixtures. Never fabricate review evidence. New rule versions get new IDs. Existing historical versions must be retained. Sequence floor is an explicit trust configuration, not a distributed transaction; production needs atomic version pointer and monotonic floor (D1 transaction or equivalent), verified rollback and key rotation. A tab pins its rule context and receipt fingerprint until refresh; no salary inputs sent to rule distribution. Preview never claims verified rules. The current runtime does not activate a new period in every UI, and cannot safely apply mixed partial-year reforms.

## Remaining
- Migrate national income, payroll, capital-gains, historical and legacy country models and their dependent eligibility/credit thresholds. Add data-driven UI country/state/year selectors.
- Design official structured-feed adapters, capture original evidence, distinguish proposal from enacted/effective law and run independent fixtures. Monitor content hashes alone must never trigger numerical changes.
- Establish a separate trusted publisher, signed artifact issuance, atomic active-version pointer and revocation/rollback, operational alerts, source coverage and freshness.
- Run cross-engine integration, hosted staging tests and independent statutory review; existing production gate stays closed. No automatic production deployment or ads.
