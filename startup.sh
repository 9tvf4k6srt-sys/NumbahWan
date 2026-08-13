#!/bin/sh
set -eu
cd /workspace
if ! curl -sf -o /dev/null --max-time 2 http://127.0.0.1:8080/; then
  npm run dev >>/tmp/app-startup.log 2>&1 &
fi
# Daily nuance probe — only if the last run is older than a day.
STAMP=/workspace/.grok/learnings/daily/stamp
if [ ! -f "$STAMP" ] || [ "$(($(date +%s) - $(stat -c %Y "$STAMP" 2>/dev/null || echo 0)))" -gt 86400 ]; then
  if command -v node >/dev/null 2>&1; then
    node /workspace/scripts/daily-improve.mjs >>/workspace/.grok/learnings/daily/cron.log 2>&1 &
  fi
fi
exit 0
