#!/bin/sh
# Best-effort crontab. Sandbox may not have a cron daemon — startup.sh
# also runs the daily job if the last stamp is older than a day.
set -eu
cd /workspace
chmod +x /workspace/scripts/cron-daily-improve.sh /workspace/scripts/daily-improve.mjs || true
line="15 4 * * * /workspace/scripts/cron-daily-improve.sh"
if command -v crontab >/dev/null 2>&1; then
  existing="$(crontab -l 2>/dev/null || true)"
  if printf "%s\n" "$existing" | grep -q "cron-daily-improve.sh"; then
    echo "cron already installed"
  else
    printf "%s\n%s\n" "$existing" "$line" | crontab - || echo "crontab install failed (no daemon?)"
  fi
else
  echo "no crontab binary — relying on startup.sh stamp check"
fi
