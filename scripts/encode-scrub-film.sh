#!/bin/sh
# HARD RULE: scroll-scrub film must be all-intra H.264 (GOP=1).
# Characters live IN the shot. Zakum pieces are arms with fingers.
# qa-zakum-hands.py samples FIVE timestamps — a mid-clip drop fails.
# qa-film-motion.py rejects Ken-Burns stills.
set -eu
cd /workspace
python3 /workspace/scripts/qa-research.py
python3 /workspace/scripts/qa-alive.py
python3 /workspace/scripts/qa-emblem.py
python3 /workspace/scripts/qa-zakum-hands.py
python3 /workspace/scripts/qa-film-motion.py
