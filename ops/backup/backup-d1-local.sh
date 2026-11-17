#!/usr/bin/env bash
# Encrypted production D1 export onto owner's separate server/disk.
# Does not run in GitHub Actions. Never writes to production D1.
set -Eeuo pipefail
umask 077
for tool in node npm npx age age-keygen gzip sqlite3 python3 sha256sum mktemp realpath; do
  command -v "$tool" >/dev/null || { echo "Missing required local program: $tool" >&2; exit 2; }
done
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd -P)"
DEST="${YORPHIVES_BACKUP_DIR:-$HOME/yorphives-backups}"
IDENTITY="${YORPHIVES_BACKUP_KEY:-$HOME/.config/yorphives-backup/identity.agekey}"
if [[ "$DEST" != /* || "$IDENTITY" != /* ]]; then
  echo "Backup directory and identity must be absolute paths" >&2;exit 2
fi
mkdir -p -- "$DEST" "$(dirname "$IDENTITY")"
DEST="$(realpath "$DEST")"
IDENTITY="$(realpath -m "$IDENTITY")"
if [[ "$IDENTITY" == "$ROOT" || "$IDENTITY" == "$ROOT"/* ]]; then
  echo "Refusing to store the private age key inside the Git repository" >&2;exit 3
fi
if [[ "$DEST" == "$ROOT" || "$DEST" == "$ROOT"/* ]]; then
  echo "Refusing to store backups inside the Git repository" >&2;exit 3
fi
if [[ ! -f "$IDENTITY" ]]; then
  age-keygen -o "$IDENTITY" >/dev/null
  chmod 600 "$IDENTITY"
  echo "IMPORTANT: Copy your new private age identity to a separate offline device."
fi
RECIPIENT="$(age-keygen -y "$IDENTITY")"
[[ "$RECIPIENT" == age1* ]] || { echo "Invalid encryption key" >&2;exit 3; }
TEMP="$(mktemp -d)"
trap 'rm -rf -- "$TEMP"; if [[ -n "${OUT:-}" ]]; then rm -f -- "$OUT.pending"; fi' EXIT
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
OUT="$DEST/yorphives-production-$STAMP.sql.gz.age"
if [[ -e "$OUT" ]]; then echo "Backup already exists; refusing overwrite" >&2;exit 3;fi
echo "Exporting live D1 read-only; exports may briefly block other requests."
npx --yes wrangler@4.163.0 d1 export yorphives-impact-analytics-live --config "$ROOT/edge/live/wrangler.jsonc" --remote --skip-confirmation --output="$TEMP/production.sql"
[[ -s "$TEMP/production.sql" ]] || { echo "D1 export empty" >&2;exit 4; }
sqlite3 -bail "$TEMP/pre-encryption-verify.sqlite" < "$TEMP/production.sql"
python3 "$(dirname "${BASH_SOURCE[0]}")/validate-sqlite.py" "$TEMP/pre-encryption-verify.sqlite"
gzip -c "$TEMP/production.sql" | age -r "$RECIPIENT" -o "$OUT.pending"
chmod 600 "$OUT.pending"
mv -- "$OUT.pending" "$OUT"
(cd "$DEST" && sha256sum "$(basename "$OUT")" > "$(basename "$OUT").sha256")
bash "$(dirname "${BASH_SOURCE[0]}")/verify-encrypted-backup.sh" "$OUT"
echo "SUCCESS: Encrypted SQL backup exists at $OUT"
echo "NEXT: Copy both the encrypted file and your separate private age key OFF this server."
