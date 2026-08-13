#!/usr/bin/env python3
"""Cut every guild face from the 1280×580 member-list grids.

Dark skin is darker than a luma-38 gate, so MaNiojoja became a
hair blob and 蕾與摩 became a hat. Keep anything that is not the
card plate. Crop tight to the whole character. 512² out.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

ROOT = Path("/workspace")
HUNT = ROOT / "screenshots" / "roster-hunt"
OUT = ROOT / "public" / "brand" / "roster"
DBG = ROOT / "screenshots" / "roster-recrop"
OUT.mkdir(parents=True, exist_ok=True)
DBG.mkdir(parents=True, exist_ok=True)

COLS = [(18, 422), (438, 842), (858, 1262)]
ROWS = [(10, 192), (202, 386), (398, 578)]

PAGES = {
    "core-grid.png": [
        ["reggina", "gege", "tzxia2"],
        ["bingfeng", "reggino", "sun"],
        ["aguang", "gawd", "regginkrad"],
    ],
    "mid-grid.png": [
        ["chengze", "qniao", "neila"],
        ["niojojer", "belive", "yulunerqing"],
        ["maniojoja", "queenk", "tis36"],
    ],
    "late-grid.png": [
        ["leiyumo", "heiqi", "shagua"],
        ["guning", "wantao", "yuluner"],
        [None, None, None],
    ],
}

SIZE = 512


def luma(a: np.ndarray) -> np.ndarray:
    r, g, b = a[:, :, 0].astype(np.int16), a[:, :, 1].astype(np.int16), a[:, :, 2].astype(np.int16)
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def character_mask(a: np.ndarray) -> np.ndarray:
    L = luma(a)
    mx = a.max(axis=2).astype(np.int16)
    mn = a.min(axis=2).astype(np.int16)
    sat = (mx - mn) > 14
    # Card plate is ~8-20. Dark skin still sits above that.
    return (L > 22) | sat


def extract_face(card: Image.Image) -> Image.Image | None:
    a = np.array(card.convert("RGB"))
    H, W = a.shape[:2]
    # Keep most of the card. Name is a thin top bar; chips a thin bottom.
    y0 = int(H * 0.14)
    y1 = int(H * 0.90)
    x0 = int(W * 0.02)
    x1 = int(W * 0.70)
    roi = a[y0:y1, x0:x1]
    if roi.size == 0:
        return None
    keep = character_mask(roi)
    r, g, b = roi[:, :, 0], roi[:, :, 1], roi[:, :, 2]
    lime = (g > 155) & (g > r + 24) & (g > b + 14)
    keep = keep & ~lime
    ys, xs = np.where(keep)
    if len(xs) < 60:
        return None
    bx0, bx1 = int(xs.min()), int(xs.max())
    by0, by1 = int(ys.min()), int(ys.max())
    pw, ph = max(1, bx1 - bx0), max(1, by1 - by0)
    pad = int(max(pw, ph) * 0.10) + 4
    bx0 = max(0, bx0 - pad)
    by0 = max(0, by0 - pad)
    bx1 = min(roi.shape[1], bx1 + pad)
    by1 = min(roi.shape[0], by1 + pad)
    tile = Image.fromarray(roi).crop((bx0, by0, bx1, by1))
    tw, th = tile.size
    side = max(tw, th)
    plate = Image.new("RGB", (side, side), (16, 18, 22))
    plate.paste(tile, ((side - tw) // 2, (side - th) // 2))
    hi = plate.resize((SIZE, SIZE), Image.Resampling.LANCZOS)
    hi = hi.filter(ImageFilter.UnsharpMask(radius=1.1, percent=70, threshold=2))
    return hi


def inspect(im: Image.Image) -> dict:
    a = np.array(im.convert("RGB"))
    H, W = a.shape[:2]
    keep = character_mask(a)
    ys, xs = np.where(keep)
    if len(xs) < 200:
        return {"ok": False, "why": "empty", "w": W, "h": H}
    cx, cy = float(xs.mean() / W), float(ys.mean() / H)
    fill = float(keep.mean())
    face = float(keep[int(H * 0.34) : int(H * 0.80)].mean())
    reasons = []
    if W < 384 or H < 384:
        reasons.append(f"low-res {W}x{H}")
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
        "why": "; ".join(reasons) if reasons else "ok",
        "cx": round(cx, 3),
        "cy": round(cy, 3),
        "fill": round(fill, 3),
        "face": round(face, 3),
        "w": W,
        "h": H,
    }


def main() -> None:
    report = []
    fails = []
    for fname, rows in PAGES.items():
        src = HUNT / fname
        im = Image.open(src).convert("RGB")
        for r, names in enumerate(rows):
            for c, slug in enumerate(names):
                if not slug:
                    continue
                x0, x1 = COLS[c]
                y0, y1 = ROWS[r]
                card = im.crop((x0, y0, x1, y1))
                card.save(DBG / f"card-{slug}.jpg", quality=90)
                tile = extract_face(card)
                if tile is None:
                    fails.append(f"{slug}: empty card")
                    continue
                tile.save(OUT / f"{slug}.png")
                tile.save(DBG / f"{slug}.png")
                q = inspect(tile)
                report.append({"slug": slug, **q})
                print(f"{slug:14} {q['why']:32} cx={q.get('cx')} cy={q.get('cy')} fill={q.get('fill')} face={q.get('face')}")
                if not q["ok"]:
                    fails.append(f"{slug} {q['why']}")
    out = {"pass": len(fails) == 0, "n": len(report), "fails": fails, "rows": report}
    (DBG / "report.json").write_text(json.dumps(out, indent=2))
    print(json.dumps({"pass": out["pass"], "n": out["n"], "fails": fails}, indent=2))
    if fails:
        sys.exit(1)


if __name__ == "__main__":
    main()
