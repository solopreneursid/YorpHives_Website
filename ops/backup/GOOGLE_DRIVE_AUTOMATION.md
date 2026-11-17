# Optional Google Drive off-site encrypted backups

This adapter is **optional**; it does not run on YorpHives, Headquarters,
Cloudflare or GitHub. It runs under the founder's own Ubuntu user and does not
receive website deployment, D1-write, or AI agent permissions.

**Existing manually uploaded recovery copy:** remains safe in
`My Drive → YorpHives Private Backups`. Do **not** delete or move it.
The automated flow creates a new `My Drive → YorpHives Automated Backups`
folder so it can use the restricted Google Drive `drive.file` OAuth scope.

## 1. Set up an owner-controlled rclone OAuth client

The shared rclone Google Drive client ID **is being retired during 2026**;
do not rely on it for unattended backups. Follow the up-to-date official
instructions at https://rclone.org/drive/#making-your-own-client-id
to create your own Google OAuth Desktop client in Google Cloud Console.
Google Drive API must be enabled. Keep the Client ID and Client Secret
PRIVATE. For long-lived backup automation, avoid leaving the OAuth
consent app in `Testing`: in Testing, Drive-scope refresh grants can expire
after seven days. For personal use (under Google's documented limits),
publishing your own OAuth consent app does *not* publish your backup files.

Install the open-source rclone binary locally:

```bash
sudo apt-get update
sudo apt-get install -y rclone
rclone version
rclone config
```

In the interactive prompts:
- Choose **n** (new remote).
- Enter the exact remote name **yhdrive**.
- Choose storage **drive** (Google Drive).
- Enter your own newly created Desktop **client_id** and **client_secret**.
- Choose restricted scope `drive.file` (items created by rclone only).
- Leave service-account credentials empty.
- Use browser authorization and sign into the same Google account as your
  manually uploaded recovery copy. Keep shared/team drive disabled unless
  you actually use a Shared Drive.
- Confirm and save the remote.

Do **not** paste the client secret, access token, `rclone.conf`, private
`.agekey`, or Google sign-in recovery codes into chat.

## 2. Verify encryption before any cloud upload

From the existing owner-controlled Ubuntu clone, update to the current
release branch and run the encrypted-only upload. It automatically validates
the encrypted backup checksum and locally restores the newest archive before
creating the restricted automated folder and copying archives to Drive.

```bash
cd "$HOME/yorphives-backup-code"
git pull --ff-only origin release/yorphives-reimagined-20261116
rclone listremotes
bash ops/backup/google-drive-copy.sh
```

Success is **PASS: Encrypted YorpHives backup and checksum verified in Google
Drive.** The script compares the actual encrypted bytes using
`rclone check --download --one-way`. It cannot upload identity keys, plain
SQL, authentication configs, or arbitrary local files; only filenames matching
`yorphives-production-*.sql.gz.age` and their `.sha256` manifests are
eligible. It uses `copy --immutable` and **never deletes** Google Drive
backups. The original manual archive remains in its separate Drive folder.

## 3. Enable a weekly founder-controlled timer

```bash
bash ops/backup/install-weekly-timer.sh
systemctl --user list-timers yorphives-encrypted-backup.timer
```

Schedule: Sunday **03:00 local computer time**; `Persistent=true` runs a
missed job when the user's systemd manager next becomes active. The machine
must have power and internet. User timers may stop when the user logs out
unless lingering is enabled; no global timer or root process is installed.

The weekly job executes a fresh Wrangler D1 SQL export using your own
Cloudflare authorization, verifies a local disposable SQLite restore,
encrypts the SQL, rechecks decryption, and uploads **only** encrypted files.
If Drive is offline it keeps the encrypted local copy; an error is reported
in the user's systemd journal, without printing the short-lived SQL export
URL to the persistent logs.

Check status without showing secrets:

```bash
systemctl --user status yorphives-encrypted-backup.timer
systemctl --user show yorphives-encrypted-backup.service --property=Result
cat "$HOME/.local/state/yorphives-backup/last-success"
```

The `last-success` file exists **only after both local and cloud
verification succeed**. To pause automation:

```bash
systemctl --user disable --now yorphives-encrypted-backup.timer
```

No automated remote deletion or rotation is enabled. Local/Drive retention
can be introduced only after separately tested restore redundancy and a
founder-approved, bounded retention policy.

**Real production automation is not verified until the founder authorizes
rclone, runs the first encrypted-only upload, enables the local timer, and
observes its first successful scheduled completion.** GitHub CI uses a
synthetic SQLite fixture and fake rclone; it does not access Drive or D1.
