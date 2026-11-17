#!/usr/bin/env bash
# Called only by founder-controlled local systemd, never Cloudflare or HQ.
set -Eeuo pipefail
umask 077
for bin in flock mktemp date; do
  command -v "$bin" >/dev/null || { echo "Missing command: $bin" >&2; exit 2; }
done
DIR="$HOME/.local/state/yorphives-backup"
mkdir -p -m 700 "$DIR"
exec 9>"$DIR/weekly.lock"
if ! flock -n 9; then
  echo "Another backup is running; skipping concurrent job" >&2
  exit 1
fi
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd -P)"
TEMP="$(mktemp -d)"
trap 'rm -rf -- "$TEMP"' EXIT
# Temporary logs can contain Cloudflare's expiring signed SQL-export link.
# They are securely isolated and deleted; never print access tokens or links
# into the long-lived systemd journal or into Google Drive.
if ! bash "$ROOT/ops/backup/backup-d1-local.sh" >"$TEMP/export.log" 2>&1; then
  echo "ERROR: Encrypted production D1 backup failed; inspect via manual script." >&2
  exit 1
fi
if ! bash "$ROOT/ops/backup/google-drive-copy.sh" >"$TEMP/upload.log" 2>&1; then
  echo "ERROR: Drive upload or verification failed; local encrypted copy remains." >&2
  exit 1
fi
printf 'verified_utc=%s\nmethod=owner-encrypted-d1-drive\n' "$(date -u +'%Y-%m-%dT%H:%M:%SZ')" >"$DIR/last-success.tmp"
mv -f -- "$DIR/last-success.tmp" "$DIR/last-success"
echo "PASS: Weekly encrypted D1 backup, local restore, and verified Google Drive copy."
