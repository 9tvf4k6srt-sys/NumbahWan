#!/usr/bin/env python3
"""Fail-closed: a film clip must MOVE.

Ken-Burns of a still is not a film. Compare t=0.3 vs t=5.4.
Live I2V on this project lands MAE ~36–50. Frozen plates land ~24.
"""
from __future__ import annotations

import json
import subprocess
import sys
import tempfile
from pathlib import Path

import numpy as np
from PIL import Image

VIDEO = Path("/workspace/public/film/video")
FF = "/usr/local/bin/ffmpeg"
CLIPS = [
    "02-orbit",
    "03-field",
    "04-forest",
    "05-hall",
    "06-raid",
    "07-climb",
    "08-invite",
]
# Below this is a still / Ken Burns. Field/hall live around 36–44.
MIN_MAE = 32.0


def grab(src: Path, t: float, dest: Path) -> bool:
    try:
        subprocess.check_call(
            [FF, "-y", "-ss", f"{t:.2f}", "-i", str(src), "-frames:v", "1", "-q:v", "3", str(dest)],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
        return dest.exists() and dest.stat().st_size > 800
    except subprocess.CalledProcessError:
        return False


def mae(a: Path, b: Path) -> float:
    A = np.asarray(Image.open(a).convert("RGB"), dtype=np.float32)
    B = np.asarray(Image.open(b).convert("RGB"), dtype=np.float32)
    if A.shape != B.shape:
        B = np.asarray(
            Image.open(b).convert("RGB").resize((A.shape[1], A.shape[0])),
            dtype=np.float32,
        )
    return float(np.mean(np.abs(A - B)))


def report() -> dict:
    fail = []
    stats = {}
    with tempfile.TemporaryDirectory(prefix="motion-") as tmp:
        tmp_p = Path(tmp)
        for clip in CLIPS:
            src = VIDEO / f"{clip}.mp4"
            if not src.exists():
                fail.append(f"{clip}: no video")
                continue
            a = tmp_p / f"{clip}_a.jpg"
            b = tmp_p / f"{clip}_b.jpg"
            if not grab(src, 0.30, a) or not grab(src, 5.40, b):
                fail.append(f"{clip}: grab failed")
                continue
            score = mae(a, b)
            stats[clip] = round(score, 2)
            if score < MIN_MAE:
                fail.append(f"{clip}: still/Ken-Burns (mae {score:.1f} < {MIN_MAE})")
    return {
        "pass": len(fail) == 0,
        "why": "; ".join(fail) if fail else "clips move like I2V, not a still",
        "stats": stats,
    }


if __name__ == "__main__":
    out = report()
    print(json.dumps(out, ensure_ascii=False, indent=2))
    sys.exit(0 if out["pass"] else 1)
