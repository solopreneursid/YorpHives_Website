#!/usr/bin/env bash
# Local-only offline restore drill. Reads an encrypted backup and temporary files.
set -Eeuo pipefail
umask 077
if [[ $# -ne 1 || ! -f "$1" ]]; then
  echo "Usage: bash ops/backup/verify-encrypted-backup.sh /absolute/path/to/backup.sql.gz.age" >&2
  exit 2
fi
for tool in age gzip sqlite3 python3 sha256sum mktemp realpath; do
  command -v "$tool" >/dev/null || { echo "Missing required local program: $tool" >&2; exit 2; }
done
BACKUP="$(realpath "$1")"
IDENTITY="${YORPHIVES_BACKUP_KEY:-$HOME/.config/yorphives-backup/identity.agekey}"
if [[ ! -f "$IDENTITY" ]]; then
  echo "Private backup identity unavailable; restore needs the protected owner key" >&2
  exit 3
fi
if [[ -f "$BACKUP.sha256" ]]; then
  (cd "$(dirname "$BACKUP")" && sha256sum --check "$(basename "$BACKUP").sha256" --status) ||
    { echo "Encrypted backup checksum mismatch" >&2; exit 3; }
fi
TEMP="$(mktemp -d)"
trap 'rm -rf -- "$TEMP"' EXIT
age -d -i "$IDENTITY" "$BACKUP" | gzip -dc > "$TEMP/restore.sql"
sqlite3 -bail "$TEMP/restore.sqlite" < "$TEMP/restore.sql"
python3 "$(dirname "${BASH_SOURCE[0]}")/validate-sqlite.py" "$TEMP/restore.sqlite"
echo "PASS: Encrypted backup decrypted and restored into disposable local SQLite. Live D1 untouched."
