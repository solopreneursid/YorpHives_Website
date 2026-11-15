# YorpHives read-only reviewer

This folder contains a small, deterministic source reviewer. It can check a snapshot on demand, watch a local directory, or poll a public GitHub branch. It reports observations and recommended follow-up; it does not implement fixes, post comments, deploy, or change the website. A watched branch does not monitor unmerged pull requests unless the watched branch is the pull request's head.

The reviewer is not an AI model and is not a replacement for a browser test, a complete security scan, or human review. Playwright, Reviewdog, Betterleaks, Trivy, and PR-Agent are listed in `inventory.json` as candidates; they are not integrated or enabled here. Their status in the report remains `not_run`. Nothing runs automatically until an operator installs and starts a trusted copy of this reviewer on a suitable machine.

## What is checked

- A selection of HTML, accessibility, local-link, catalog, and JavaScript syntax checks.
- A limited set of potentially sensitive strings and risky code patterns. Findings redact matching secret values. This is not a complete credential or vulnerability scan.
- Optional Node unit tests only if a network-isolated, read-only bubblewrap sandbox starts successfully. If it does not, tests are explicitly reported as `not_run`; candidate tests are never executed on the host as a fallback.

Reports are written outside the project, with report files restricted to the owner. The status describes only the checks that actually ran. Skipped, unavailable, or inapplicable checks are recorded separately. External links, browser behavior, full accessibility, dependency vulnerabilities, Git history secrets, and AI review are not checked by this implementation.

## Run once

From a trusted copy of the website repository with Python 3 and Node.js installed:

```sh
python3 review/bot.py scan --root . --sandboxed-tests
```

The JSON report prints to the terminal. To save it outside the checkout:

```sh
python3 review/bot.py scan --root . --sandboxed-tests --output /tmp/yorphives-review.json
```

A source change during a scan cancels the report. A nonzero exit code signals findings requiring attention or a review error; read the individual check statuses before drawing conclusions.

## Monitor a public GitHub branch

Run the following from a trusted, operator-controlled copy of the reviewer, on a machine with Git and outbound access to GitHub:

```sh
python3 review/bot.py watch-git \
  --repo https://github.com/solopreneursid/YorpHives_Website.git \
  --branch yorphives-frontend \
  --state-dir "$HOME/.local/state/yorphives-review" \
  --interval 300 --sandboxed-tests
```

The process checks every five minutes and reviews changed commits. It keeps its public Git mirror and reports in the state directory, including `reports/latest.json`; it does not push to GitHub. Stop it with Ctrl+C. It must remain running to monitor changes; this project does not install a background service or send alerts. Private repositories are not supported. The watcher rejects symlinks, submodules, oversized snapshots, and archives whose files differ from their Git objects; unsupported changes are reported as errors instead of silently ignored.

For changes to a local working directory, replace the preceding command with:

```sh
python3 review/bot.py watch --root . --state-dir "$HOME/.local/state/yorphives-local-review" --interval 60 --sandboxed-tests
```

Add `--once` to either watcher to check once and exit. The `watch` mode scans the current directory as files change, including uncommitted files; `watch-git` monitors only the selected public branch.

## Operating boundaries

Run a reviewed and pinned copy of the reviewer from an operator-controlled directory rather than executing reviewer code supplied by a pull request. Use a dedicated unprivileged account, no repository-write credentials, and no production secrets. Keep snapshots, scanner configuration, and reports outside the source checkout. Review reports can contain file names and contextual findings, so keep them private.

Sandboxing depends on host kernel and bubblewrap support. Where that isolation is unavailable, unit tests are skipped. A disposable, resource-limited VM is appropriate for testing untrusted changes; do not run public pull-request code on a privileged self-hosted runner.

If the additional tools are installed later, pin and verify their open-source releases. Configure Reviewdog for local output and Betterleaks for detection only with credential validation disabled; check flags against the particular Betterleaks version because its v2 release is still a prerelease. PR-Agent needs a verified local model, a trusted operator-controlled output path **outside** the repository, and separately enforced restrictions against writes and publishing: its local provider otherwise defaults to writing reports in the repository root. Trivy needs a locally available vulnerability database and separately managed updates. Check Trivy's [supply-chain incident advisory](https://github.com/aquasecurity/trivy/security/advisories/GHSA-69fq-xp46-6x23) before selecting and verifying a release. These integrations are future work, not capabilities of this folder.

## Test the reviewer

```sh
PYTHONDONTWRITEBYTECODE=1 python3 -m unittest discover -s review/tests -v
```
