# Owner-held encrypted YorpHives D1 backups

**Status:** Backup and local restore scripts are implemented and testable using synthetic data. A real encrypted production export on the founder's own computer/server has **not** yet been executed or independently stored. The existing D1 Time Travel restore drill on a disposable database was successful, but that is **not** a substitute for off-provider backups.

## What this protects

The production D1 database `yorphives-impact-analytics-live` contains first-party usage aggregates and privacy-sensitive pseudonymous session identifiers. Never put database exports, encryption keys, artifacts or credentials in GitHub, CI, public Workers assets or browser storage.

The script uses open-source tools (Wrangler, SQLite, gzip and age) and requires no SaaS storage or recurring subscription. It exports the **live D1 using a read-only CLI command**, verifies the SQL by restoring it into a disposable local SQLite database, encrypts the SQL, and verifies decryption and restoration a second time. The encrypted file stays on your own storage. The script does **not** create D1 databases, run writes against production, or import into a live database.

## First-time setup on an owner-controlled Ubuntu/Debian machine

Install Node.js/npm, age, sqlite3 and Python 3. Connect Wrangler to the Cloudflare account with a **narrowly scoped D1-read** API credential or authorized Wrangler login. Do not place the credential in GitHub or in the script.

From your own clone of this repository:

```bash
sudo apt-get update
sudo apt-get install -y age sqlite3 python3
bash ops/backup/backup-d1-local.sh
```

The script creates `~/yorphives-backups` and automatically generates a private age identity in `~/.config/yorphives-backup/identity.agekey` on first use. **Copy the private identity to a separate offline device**, along with an encrypted backup and its `.sha256` manifest. If the identity is lost, the backups become permanently unrecoverable; if an attacker gains both the key and backups, they can decrypt production usage data.

To reverify an existing encrypted backup without accessing Cloudflare:

```bash
bash ops/backup/verify-encrypted-backup.sh "$HOME/yorphives-backups/yorphives-production-<date>.sql.gz.age"
```

Replace only the filename with one your own backup run printed. The command loads the encrypted SQL into a disposable **local** SQLite database, checks integrity and expected tables, then destroys the temporary files.

If using an external backup drive, set `YORPHIVES_BACKUP_DIR` to the drive's absolute path before running. Store the encryption key on **another** device. Avoid relying on just one disk. Review and rotate a properly scoped D1-read credential after setup.

## Production safety and operations

- Do not run the export during peak traffic: Cloudflare documents that an ongoing D1 export can block other database requests.
- Keep an offline encrypted copy separate from Cloudflare and separately protect the age identity.
- Run the script periodically through a **founder-controlled local systemd timer** only after confirming credential protection and reliable storage. HQ and its AI employees must never receive the Cloudflare token, the private age key, or write/deploy privileges.
- The CI workflow uses only synthetic SQLite data and intentionally **never** contacts production D1 or stores backup artifacts.
- Test restoration with a clean local machine/VM and an offline copy of the identity before claiming off-provider disaster recovery. Preserve evidence of checksum and SQLite integrity results.
- The script pins Wrangler `4.163.0` for repeatability. Review and upgrade it deliberately when required; its CLI version is separate from the website runtime.
- Cloudflare's official command supports full SQL export with `wrangler d1 export ... --remote --output`. This is a read operation; don't confuse it with D1 Time Travel restore, which changes the target database.
