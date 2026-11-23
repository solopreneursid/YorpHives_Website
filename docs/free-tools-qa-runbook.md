# Free Tools QA: founder operations runbook

This explains what the read-only automation tests, what its verdicts mean, and how to investigate failures. It does not grant YorpHives HQ or monitoring agents permission to change production or source code.

## Automated checks

The workflow `.github/workflows/free-tools-functional-security.yml` runs on a schedule and when manually dispatched. It checks the 143 published Free Tools using:

- Chromium browser scenarios against the public website, using synthetic files, synthetic text, and synthetic media streams. The tests block anonymous analytics and flag unexpected writes.
- Node-based output contracts for PDF, local media, and browser-local utility engines.
- An npm dependency advisory check that fails closed when the audit cannot be completed.

The inventory workflow `.github/workflows/free-tools-qa-inventory.yml` counts *defined* coverage. **Definition counts are not test passes.** Existing contracts are not sufficient to certify security, every supported input, or all desktop/mobile browsers.

## Run-backed reports

- GitHub issue #92: last complete **per-tool evidence-backed** result (passed / failed / unverified).
- GitHub issue #87: test *definition* coverage and inventories.
- Open functional failure issue: a job failed, timed out, was cancelled, or lacked evidence.

The report is published only after both local and browser evidence arrive and the browser results explicitly state `complete:true`. A cancelled or interrupted browser job must **never** replace the last complete per-tool report with artificially reduced coverage.

The browser runner prints `START`, `PASS`, and `FAIL` for each scenario in Actions logs; it writes provisional JSON after every scenario and marks the final JSON as complete only when all scenarios finish. Its per-scenario watchdog caps waits; a timeout is **not** proof that the tool itself is broken.

The full JSON verdict accompanies GitHub Actions artifacts (retained for 30 days). Failed tools and unverified tools are reported separately, and missing evidence is not counted as success or failure.

## When a check fails

1. Open the failed workflow run and inspect which job failed: browser, local contracts, or dependencies.
2. For browser failures, inspect the last `START` entry, the matching `FAIL` message, and the partial browser results artifact. Determine whether the failure is a test fixture, runner timeout, a deployment/source mismatch, browser support, or a reproducible tool defect.
3. For local contracts, inspect the exact `not ok` test and stack trace. Distinguish a bad synthetic fixture from a real incorrect output.
4. For dependencies, inspect the retained npm advisory evidence. An unavailable audit service is **not** a proven vulnerability.
5. Reproduce and fix in a reviewed development branch, rerun the tests, and use founder-controlled release procedures. **No HQ agent or monitoring job may patch code, change configuration, deploy, or alter monetization.**
6. If the browser job was interrupted, preserve the most recent *complete* report and retain a failure alert. Never claim the newly missing evidence represents broken tools.

## Remaining validation

A representative scenario validates only the specific input and assertion exercised. Strong production assurance additionally requires malformed/hostile input cases, cross-browser and mobile checks, accessibility, large-file limits, and safe failure behavior. Heavy OCR, HEIC and recorder paths also need realistic input fixtures and bounded test time.

Current behavior and guarantees are defined by the version-controlled CI workflow, runner and reporter source rather than by this explanatory document.
