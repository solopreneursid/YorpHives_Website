#!/usr/bin/env bash
# Synthetic-only offline test for the opt-in Drive copy adapter. No Drive or D1 access.
set -Eeuo pipefail
umask 077
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
TEMP="$(mktemp -d)"
trap 'rm -rf -- "$TEMP"' EXIT
mkdir -p "$TEMP/bin" "$TEMP/keys" "$TEMP/backups"
age-keygen -o "$TEMP/keys/identity.agekey" >/dev/null
RECIPIENT="$(age-keygen -y "$TEMP/keys/identity.agekey")"
ARCHIVE="$TEMP/backups/yorphives-production-20261117T000000Z.sql.gz.age"
gzip -c "$ROOT/ops/backup/test-fixture.sql" | age -r "$RECIPIENT" -o "$ARCHIVE"
(cd "$TEMP/backups" && sha256sum "$(basename "$ARCHIVE")" > "$(basename "$ARCHIVE").sha256")
echo 'DO NOT UPLOAD A RECOVERY KEY' > "$TEMP/backups/identity.agekey"
cat > "$TEMP/bin/rclone" <<'MOCK'
#!/usr/bin/env bash
set -Eeuo pipefail
op="$1"
shift
case "$op" in
  listremotes) echo 'yhdrive:';;
  mkdir) [[ "$1" == 'yhdrive:YorpHives Automated Backups' ]] ||
    { echo "Bad remote folder" >&2; exit 97; }; echo mkdir >> "$MOCK_ACTIONS";;
  copy|check)
    args="$*"
    [[ "$args" == *'yorphives-production-*.sql.gz.age'* ]] || exit 98
    [[ "$args" == *'yorphives-production-*.sql.gz.age.sha256'* ]] || exit 98
    [[ "$args" != *'identity.agekey'* ]] || exit 99
    [[ "$args" == *'yhdrive:YorpHives Automated Backups'* ]] || exit 99
    if [[ "$op" == copy ]]; then
      [[ "$args" == *'--immutable'* ]] || exit 99
    else
      [[ "$args" == *'--download'* && "$args" == *'--one-way'* ]] || exit 99
    fi
    echo "$op" >> "$MOCK_ACTIONS"
    ;;
  *) echo "Unexpected rclone call $op" >&2; exit 99;;
esac
MOCK
chmod 700 "$TEMP/bin/rclone"
export MOCK_ACTIONS="$TEMP/actions.log"
export YORPHIVES_BACKUP_DIR="$TEMP/backups"
export YORPHIVES_BACKUP_KEY="$TEMP/keys/identity.agekey"
PATH="$TEMP/bin:$PATH" bash "$ROOT/ops/backup/google-drive-copy.sh"
[[ "$(grep -c '^mkdir$' "$MOCK_ACTIONS")" -eq 1 ]] || exit 1
[[ "$(grep -c '^copy$' "$MOCK_ACTIONS")" -eq 1 ]] || exit 1
[[ "$(grep -c '^check$' "$MOCK_ACTIONS")" -eq 1 ]] || exit 1
# Tampered encrypted bytes MUST be rejected prior to mkdir/upload.
: > "$MOCK_ACTIONS"
printf 'x' >> "$ARCHIVE"
if PATH="$TEMP/bin:$PATH" bash "$ROOT/ops/backup/google-drive-copy.sh"; then
  echo "FAIL: tampered archive was accepted" >&2;exit 1
fi
if [[ -s "$MOCK_ACTIONS" ]]; then
  echo "FAIL: modified data was uploaded before validation" >&2;exit 1
fi
echo "PASS: encrypted-only upload filtering, immutable remote policy, byte check, tamper failure before upload."
