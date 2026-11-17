#!/usr/bin/env bash
# Opt-in Google Drive adapter. Only already-encrypted archives + checksums leave
# this computer; never uploads SQL, age identities, rclone auth or other files.
set -Eeuo pipefail
umask 077
for bin in rclone age gzip sqlite3 python3 sha256sum realpath; do
  command -v "$bin" >/dev/null || { echo "Missing local command: $bin" >&2; exit 2; }
done
LOCAL="${YORPHIVES_BACKUP_DIR:-$HOME/yorphives-backups}"
REMOTE='yhdrive:YorpHives Automated Backups'
if [[ ! -d "$LOCAL" ]]; then echo "Backup folder not found: $LOCAL" >&2; exit 2; fi
LOCAL="$(realpath "$LOCAL")"
if ! rclone listremotes | grep -Fxq 'yhdrive:'; then
  echo "The yhdrive remote is not connected. Run: rclone config" >&2
  exit 3
fi
shopt -s nullglob
ARCHIVES=("$LOCAL"/yorphives-production-*.sql.gz.age)
if [[ "${#ARCHIVES[@]}" -lt 1 ]]; then
  echo "No encrypted YorpHives backup found; nothing has been uploaded." >&2
  exit 4
fi
for archive in "${ARCHIVES[@]}"; do
  [[ -f "$archive" && -f "$archive.sha256" ]] || { echo "Archive or checksum missing" >&2;exit 4; }
  (cd "$LOCAL" && sha256sum --check "$(basename "$archive").sha256" --status) ||
    { echo "Encrypted archive checksum failed; refusing upload" >&2;exit 4; }
done
# Verify newest archive can actually be restored BEFORE uploading anything.
NEWEST="$(printf '%s\n' "${ARCHIVES[@]}" | sort -r | head -n 1)"
bash "$(dirname "${BASH_SOURCE[0]}")/verify-encrypted-backup.sh" "$NEWEST" >/dev/null
# The restricted Drive OAuth scope 'drive.file' can manage folders created by
# rclone itself. The owner's earlier manually uploaded folder is left alone.
rclone mkdir "$REMOTE"
rclone copy "$LOCAL" "$REMOTE" --immutable \
  --include 'yorphives-production-*.sql.gz.age' \
  --include 'yorphives-production-*.sql.gz.age.sha256'
# --one-way ignores unrelated Drive files; --download compares actual bytes.
rclone check "$LOCAL" "$REMOTE" --download --one-way \
  --include 'yorphives-production-*.sql.gz.age' \
  --include 'yorphives-production-*.sql.gz.age.sha256'
echo "PASS: Encrypted YorpHives backup and checksum verified in Google Drive."
echo "Only .sql.gz.age archives and matching .sha256 manifests were uploaded."
