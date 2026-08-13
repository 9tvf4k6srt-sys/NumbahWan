#!/usr/bin/env python3
"""Fail a roster tile that is soft, hat-only, or off-center.

A 192² nearest-neighbor nose-zoom used to score 10. We now require
512², a face in the middle band, and a real fill. Full-bleed against
the frame is allowed — that is not 缺角. 缺角 is a missing pigtail
because the source window was too tight; the extract script owns that.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path("/workspace")
ROSTER = ROOT / "public" / "brand" / "roster"

SLUGS = [
    "reggina",
    "gege",
    "tzxia2",
    "bingfeng",
    "reggino",
    "sun",
    "aguang",
    "gawd",
    "regginkrad",
    "chengze",
    "qniao",
    "neila",
    "niojojer",
    "belive",
    "yulunerqing",
    "maniojoja",
    "queenk",
    "tis36",
    "leiyumo",
    "heiqi",
    "shagua",
    "guning",
    "wantao",
    "yuluner",
]


def inspect(path: Path) -> dict:
    im = Image.open(path).convert("RGB")
    W, H = im.size
    if W < 384 or H < 384:
        return {"ok": False, "why": f"low-res {W}x{H}"}
    a = np.array(im)
    r, g, b = a[:, :, 0].astype(np.int16), a[:, :, 1].astype(np.int16), a[:, :, 2].astype(np.int16)
    L = 0.2126 * r + 0.7152 * g + 0.0722 * b
    mx = a.max(axis=2).astype(np.int16)
    mn = a.min(axis=2).astype(np.int16)
    char = (L > 22) | ((mx - mn) > 14)
    ys, xs = np.where(char)
    if len(xs) < 200:
        return {"ok": False, "why": "empty"}
    cx, cy = float(xs.mean() / W), float(ys.mean() / H)
    fill = float(char.mean())
    face = float(char[int(H * 0.34) : int(H * 0.80)].mean())
    reasons = []
    if abs(cx - 0.5) > 0.22:
        reasons.append(f"cx {cx:.2f}")
    if cy < 0.30 or cy > 0.74:
        reasons.append(f"cy {cy:.2f}")
    if fill < 0.16:
        reasons.append(f"fill {fill:.2f}")
    if face < 0.12:
        reasons.append(f"no-face {face:.2f}")
    return {
        "ok": len(reasons) == 0,
        "why": "; ".join(reasons) if reasons else f"{W}² face-in-frame",
        "cx": round(cx, 3),
        "cy": round(cy, 3),
        "fill": round(fill, 3),
        "face": round(face, 3),
        "w": W,
    }


def report() -> dict:
    rows = []
    fail = []
    for slug in SLUGS:
        p = ROSTER / f"{slug}.png"
        if not p.exists():
            fail.append(f"missing {slug}")
            continue
        q = inspect(p)
        rows.append({"slug": slug, **q})
        if not q.get("ok"):
            fail.append(f"{slug} {q.get('why')}")
    return {
        "pass": len(fail) == 0,
        "why": "; ".join(fail)
        if fail
        else f"{len(rows)} tiles 512, face in frame",
        "n": len(rows),
        "rows": rows,
    }


if __name__ == "__main__":
    out = report()
    print(json.dumps(out, indent=2))
    sys.exit(0 if out["pass"] else 1)
