#!/usr/bin/env bash
# One-time opt-in; creates only a *user* systemd timer. No sudo or HQ access.
set -Eeuo pipefail
umask 077
for bin in systemctl realpath bash rclone node age flock; do
  command -v "$bin" >/dev/null || { echo "Missing command $bin; install it first" >&2; exit 2; }
done
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd -P)"
case "$ROOT" in *[$'\n\r\t '"%]*)
  echo "Please clone this repository to a folder without spaces or % signs" >&2;exit 2;;
esac
if ! rclone listremotes | grep -Fxq 'yhdrive:'; then
  echo "Configure and verify rclone's yhdrive: OAuth remote first" >&2;exit 2
fi
if ! command -v systemd-run >/dev/null; then echo "systemd not available" >&2; exit 2;fi
UNITDIR="$HOME/.config/systemd/user"
mkdir -p -- "$UNITDIR"
SERVICE="$UNITDIR/yorphives-encrypted-backup.service"
TIMER="$UNITDIR/yorphives-encrypted-backup.timer"
# Capture the tested PATH (e.g., Node installed via a version manager);
# no keys, tokens, passwords or secrets are written into the unit.
SAFE_PATH="$PATH"
if [[ "$SAFE_PATH" == *$'\n'* || "$SAFE_PATH" == *$'\r'* || "$SAFE_PATH" == *'%'* ]]; then
  echo "Unexpected PATH; refusing to write service config" >&2; exit 3
fi
printf '[Unit]\nDescription=YorpHives owner-held encrypted production backup\n[Service]\nType=oneshot\nEnvironment=PATH=%s\nExecStart=/usr/bin/bash %s/ops/backup/run-weekly-offsite.sh\nTimeoutStartSec=45min\n' "$SAFE_PATH" "$ROOT" > "$SERVICE"
printf '[Unit]\nDescription=Weekly YorpHives encrypted database backup\n[Timer]\nOnCalendar=Sun *-*-* 03:00:00\nPersistent=true\nUnit=yorphives-encrypted-backup.service\n[Install]\nWantedBy=timers.target\n' > "$TIMER"
systemctl --user daemon-reload
systemctl --user enable --now yorphives-encrypted-backup.timer
echo "PASS: Weekly Sunday 03:00 local-time timer installed for this Ubuntu user."
echo "Check: systemctl --user list-timers yorphives-encrypted-backup.timer"
echo "It runs only while this computer's user systemd manager is operating."
