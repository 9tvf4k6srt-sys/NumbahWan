#!/usr/bin/env python3
"""Fail-closed founder SOURCE identity.

Film frames are scored by qa-alive.py (characters live in the shot).
This file locks the mannequin refs we generate from: glasses, wide
Zakum plate, both founders on disk.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path("/workspace")
FOUND = ROOT / "public" / "brand" / "founders"
FACE = Path("/workspace/screenshots/founders/lock-face.png")
A_REF = FOUND / "reggina-ref.jpg"
O_REF = FOUND / "reggino-ref.jpg"
BODY = FOUND / "reggina-body.png"

NEED = [A_REF, O_REF, FACE, BODY]


def ncc(hay: np.ndarray, needle: np.ndarray) -> float:
    best = 0.0
    for scale in (1.0, 0.7, 0.5, 0.35):
        nh = max(8, int(needle.shape[0] * scale))
        nw = max(8, int(needle.shape[1] * scale))
        if nh >= hay.shape[0] - 2 or nw >= hay.shape[1] - 2:
            continue
        nimg = np.array(
            Image.fromarray(needle).resize((nw, nh), Image.Resampling.NEAREST)
        )
        h, w = nimg.shape[:2]
        H, W = hay.shape[:2]
        n = nimg.astype(np.float32) - nimg.mean()
        denom_n = float(np.sqrt((n * n).sum())) + 1e-6
        step_y = max(1, (H - h) // 10)
        step_x = max(1, (W - w) // 10)
        for y in range(0, H - h, step_y):
            for x in range(0, W - w, step_x):
                win = hay[y : y + h, x : x + w].astype(np.float32)
                win = win - win.mean()
                denom = denom_n * (float(np.sqrt((win * win).sum())) + 1e-6)
                score = float((n * win).sum()) / denom
                if score > best:
                    best = score
    return best


def report() -> dict:
    missing = [str(p) for p in NEED if not p.exists()]
    if missing:
        return {"pass": False, "why": f"missing {missing}"}
    fail = []
    stats = {}
    body = Image.open(BODY)
    stats["body"] = f"{body.width}x{body.height}"
    if body.width < 900:
        fail.append(f"Zakum source plate too tight ({body.width}px)")
    face = np.array(Image.open(FACE).convert("L"))
    a_ref = np.array(Image.open(A_REF).convert("L"))
    g = ncc(a_ref, face)
    stats["ref_glasses"] = round(g, 3)
    if g < 0.45:
        fail.append(f"reggina-ref glasses {g:.2f} — lock is not in the ref")
    a = Image.open(A_REF)
    o = Image.open(O_REF)
    if a.width < 400 or o.width < 400:
        fail.append("refs too small")
    return {
        "pass": len(fail) == 0,
        "why": "; ".join(fail) if fail else "mannequin refs locked; film scored by qa-alive",
        "stats": stats,
    }


if __name__ == "__main__":
    out = report()
    print(json.dumps(out, ensure_ascii=False))
    sys.exit(0 if out["pass"] else 1)
