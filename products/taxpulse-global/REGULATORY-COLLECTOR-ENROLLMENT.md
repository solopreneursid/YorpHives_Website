# Independent regulatory evidence transport
2026-11-26. Preview only. No rule activation.

## Observed failures
GitHub Actions run 45750589819: authentic workflow identity verifies in Node, but the Worker returns 401 issuer_unavailable. Run 45750993577: public artifact metadata and digest are genuine; deployed artifact-proof endpoint returns 401 artifact_proof_rejected. Do not pin stale public issuer keys or accept caller-supplied verification keys. The downloaded archive SHA-256 is ea5db74844cd4495e92b83ce506b1fb84020c5c6047057bdb3a6be9bd58bd807; exact report SHA-256 is 4d6bcf969df1ae8ef8311e5732af31243b1c96c9601bad8f244e9314439e6c74. The authorized connector import acknowledged the report (29/30 cross-collector reachability), but direct KV read-back returned 404. Persistence is unconfirmed; do not claim daily independent submission is working.

## Offline-verifiable transport
The daily collector can sign the exact body digest, run ID, timestamp, and purpose with an isolated Ed25519 collector key. The Worker verifies the signature using the explicitly enrolled public key, without fetching identity-provider or artifact metadata. It accepts review-only evidence into the existing regulatory observation store. The collector key cannot sign regulatory snapshots, certify statutory review, publish rules, change source code or deploy. Artifact verification is disabled by default. OIDC remains an optional path, not relied upon for daily delivery.

## Enrollment
On the founder's trusted local machine, with Node.js 22+ and authenticated GitHub CLI, check out the TaxPulse development branch and run from products/taxpulse-global:
```sh
node scripts/enroll-regulatory-collector.mjs ENROLL_TAXPULSE_EVIDENCE
```
The command generates a separate collector key pair and writes the private PEM directly to the repository Actions secret TAXPULSE_EVIDENCE_PRIVATE_KEY. It refuses to replace an existing secret. Share only the printed public verification key (64 hexadecimal characters) with the authorized Cloudflare administrator. Enroll it as EVIDENCE_COLLECTOR_PUBLIC_KEY on hqventures-taxpulse-regulatory-evidence-preview only; verify bindings and current Worker version. The signing job must be restricted to the trusted daily main workflow. Never paste the private key into chat, put it in source code, artifacts, logs, or statutory approval configuration.

Verify the first signed daily workflow response and direct KV read-back, including checkedAt, collectorRunId, exact digest, provenance and automaticRuleChanges=false. If enrollment fails or the public key is lost, coordinate rotation of both sides; never silently replace just one side. If the collector key is compromised, disable its public key immediately and review affected evidence. This does not affect the publisher's separately enrolled keys.

## Separate publication approval
The founder-controlled publisher and independent qualified statutory reviewer must each enroll distinct public keys with secure private key custody. Do not reuse the collector key. The publisher remains inactive until approved rule packages exist and the separate release gate is satisfied.
