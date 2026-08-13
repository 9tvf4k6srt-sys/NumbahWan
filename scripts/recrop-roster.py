#!/usr/bin/env python3
"""Recenter every guild portrait from the 88px hunt tiles.

Hard-drop the top status pill. Flood only dark chrome — never gold,
or yellow characters get eaten. Fall back to the known final/ plate
if a hunt cell is an empty seat.
"""
from __future__ import annotations

import json
import sys
from collections import deque
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path("/workspace")
HUNT = ROOT / "screenshots" / "roster-hunt"
FINAL = HUNT / "final"
OUT_DIR = ROOT / "public" / "brand" / "roster"
DBG = ROOT / "screenshots" / "roster-recrop"
OUT_DIR.mkdir(parents=True, exist_ok=True)
DBG.mkdir(parents=True, exist_ok=True)

MAP = [
    ("c-r1c1.png", "reggina"),
    ("c-r1c2.png", "gege"),
    ("c-r1c3.png", "tzxia2"),
    ("c-r2c1.png", "bingfeng"),
    ("c-r2c2.png", "reggino"),
    ("c-r2c3.png", "sun"),
    ("c-r3c1.png", "aguang"),
    ("c-r3c2.png", "gawd"),
    ("c-r3c3.png", "regginkrad"),
    ("m-r1c1.png", "chengze"),
    ("m-r1c2.png", "qniao"),
    ("m-r1c3.png", "neila"),
    ("m-r2c1.png", "niojojer"),
    ("m-r2c2.png", "belive"),
    ("m-r2c3.png", "yulunerqing"),
    ("m-r3c1.png", "maniojoja"),
    ("m-r3c2.png", "queenk"),
    ("m-r3c3.png", "tis36"),
    ("l-r1c1.png", "leiyumo"),
    ("l-r1c2.png", "heiqi"),
    ("l-r1c3.png", "shagua"),
    ("l-r2c1.png", "guning"),
    ("l-r2c2.png", "wantao"),
    ("l-r2c3.png", "yuluner"),
]


def flood(mask: np.ndarray) -> np.ndarray:
    H, W = mask.shape
    out = np.zeros((H, W), dtype=bool)
    q: deque[tuple[int, int]] = deque()
    for x in range(W):
        if mask[0, x]:
            q.append((0, x))
        if mask[H - 1, x]:
            q.append((H - 1, x))
    for y in range(H):
        if mask[y, 0]:
            q.append((y, 0))
        if mask[y, W - 1]:
            q.append((y, W - 1))
    while q:
        y, x = q.popleft()
        if y < 0 or y >= H or x < 0 or x >= W or out[y, x] or not mask[y, x]:
            continue
        out[y, x] = True
        q.append((y - 1, x))
        q.append((y + 1, x))
        q.append((y, x - 1))
        q.append((y, x + 1))
    return out


def recrop(path: Path) -> Image.Image | None:
    im = Image.open(path).convert("RGB")
    a = np.array(im)
    H, W = a.shape[:2]
    # Status pills live in the top band. Cut them off before color work
    # so a yellow character is never mistaken for a Today chip.
    cut_y = int(H * 0.16)
    a = a[cut_y:, :, :]
    H, W = a.shape[:2]
    r, g, b = a[:, :, 0].astype(np.int16), a[:, :, 1].astype(np.int16), a[:, :, 2].astype(np.int16)
    L = 0.2126 * r + 0.7152 * g + 0.0722 * b
    # Empty seat: almost no mid-luma content
    if (L > 50).mean() < 0.04:
        return None
    chrome = L < 46
    drop = flood(chrome)
    keep = ~drop
    ys, xs = np.where(keep)
    if len(xs) < 30:
        return None
    x0, x1 = int(xs.min()), int(xs.max())
    y0, y1 = int(ys.min()), int(ys.max())
    cx = (x0 + x1) / 2 + (x1 - x0) * 0.04
    cy = (y0 + y1) / 2 + (y1 - y0) * 0.06
    side = max(x1 - x0, y1 - y0) * 1.05
    side = max(18, side)
    half = side / 2
    left = int(round(cx - half))
    top_ = int(round(cy - half))
    right = int(round(cx + half))
    bot = int(round(cy + half))
    if left < 0:
        right -= left
        left = 0
    if top_ < 0:
        bot -= top_
        top_ = 0
    if right > W:
        left -= right - W
        right = W
    if bot > H:
        top_ -= bot - H
        bot = H
    left = max(0, left)
    top_ = max(0, top_)
    tile = Image.fromarray(a).crop((left, top_, max(left + 8, right), max(top_ + 8, bot)))
    return tile.resize((192, 192), Image.Resampling.NEAREST)


def quality(im: Image.Image) -> dict:
    a = np.array(im.convert("RGB"))
    r, g, b = a[:, :, 0].astype(np.int16), a[:, :, 1].astype(np.int16), a[:, :, 2].astype(np.int16)
    L = 0.2126 * r + 0.7152 * g + 0.0722 * b
    H, W = L.shape
    char = L > 42
    ys, xs = np.where(char)
    if len(xs) < 40:
        return {"ok": False, "why": "almost empty", "cx": 0, "cy": 0, "fill": 0, "pill": 1}
    cx, cy = float(xs.mean() / W), float(ys.mean() / H)
    fill = float(char.mean())
    gtop = g[: int(H * 0.14)]
    rtop = r[: int(H * 0.14)]
    btop = b[: int(H * 0.14)]
    pill = float(((gtop > 150) & (gtop > rtop + 22) & (gtop > btop + 12)).mean())
    ok = (
        abs(cx - 0.5) <= 0.18
        and 0.36 <= cy <= 0.70
        and fill >= 0.28
        and pill < 0.05
    )
    return {
        "ok": bool(ok),
        "cx": round(cx, 3),
        "cy": round(cy, 3),
        "fill": round(fill, 3),
        "pill": round(pill, 3),
    }


def main() -> None:
    report = []
    fails = []
    for fname, slug in MAP:
        src = HUNT / fname
        tile = recrop(src) if src.exists() else None
        used = fname
        if tile is None:
            fb = FINAL / f"{slug}.png"
            tile = recrop(fb) if fb.exists() else None
            used = f"final/{slug}.png"
        if tile is None:
            fails.append(f"{slug}: no usable source")
            continue
        tile.save(OUT_DIR / f"{slug}.png")
        tile.save(DBG / f"{slug}.png")
        q = quality(tile)
        row = {"slug": slug, "src": used, **q}
        report.append(row)
        if not q["ok"]:
            fails.append(f"{slug} {q}")
    out = {"pass": len(fails) == 0, "n": len(report), "fails": fails, "rows": report}
    print(json.dumps(out, indent=2))
    (DBG / "report.json").write_text(json.dumps(out, indent=2))
    if fails:
        sys.exit(1)


if __name__ == "__main__":
    main()
