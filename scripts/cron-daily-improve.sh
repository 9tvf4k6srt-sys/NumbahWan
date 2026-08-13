#!/bin/sh
# Daily NumbahWan critic + nuance probe.
# Installed by scripts/install-cron.sh. Safe if the app is down — it just logs.
set -eu
cd /workspace
mkdir -p /workspace/.grok/learnings/daily
if curl -sf -o /dev/null --max-time 2 http://127.0.0.1:8080/; then
  :
else
  echo "daily-improve: app not up, skip probe" >> /workspace/.grok/learnings/daily/cron.log
  exit 0
fi
node /workspace/scripts/daily-improve.mjs >> /workspace/.grok/learnings/daily/cron.log 2>&1 || true
