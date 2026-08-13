#!/usr/bin/env python3
"""Remove the customization-studio grass island from founder cutouts.

The island is why overlays read as stickers. Characters must stand on
the real world floor. Totem wood is NOT dirt — only the bottom platform.
"""
from __future__ import annotations

from collections import deque
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path("/workspace")
FOUND = ROOT / "public" / "brand" / "founders"
DBG = ROOT / "screenshots" / "founders"


def strip(src: Path, dst: Path, name: str) -> dict:
    im = Image.open(src).convert("RGBA")
    a = np.array(im)
    rgb = a[..., :3].astype(np.int16)
    alpha = a[..., 3]
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    H, W = alpha.shape

    grass = (alpha > 20) & (g > r + 12) & (g > b + 8) & (g > 70)
    # dirt / soil of the studio platform — lower 45% only
    dirt = (
        (alpha > 20)
        & (np.arange(H)[:, None] > int(H * 0.48))
        & (r > 70)
        & (r < 200)
        & (g > 45)
        & (g < 160)
        & (b < 110)
        & (r > b + 18)
        & (g < r + 25)
        & (g > r - 55)
    )
    # do not treat Zakum wood above mid as dirt
    platform = grass | dirt

    # seed from the lowest opaque platform pixels, not the padded edge
    drop = np.zeros((H, W), dtype=bool)
    q: deque[tuple[int, int]] = deque()
    ys, xs = np.where(alpha > 20)
    if ys.size == 0:
        raise SystemExit(f"{name}: empty cut")
    low = int(ys.max())
    seed_from = max(0, low - 18)
    for y in range(seed_from, H):
        for x in range(W):
            if platform[y, x]:
                drop[y, x] = True
                q.append((y, x))
    # grass in the lower 42% is the studio island, not the teal dress
    grass_low = grass & (np.arange(H)[:, None] > int(H * 0.58))
    gy, gx = np.where(grass_low)
    for y, x in zip(gy.tolist(), gx.tolist()):
        if not drop[y, x]:
            drop[y, x] = True
            q.append((y, x))
    while q:
        y, x = q.popleft()
        for dy, dx in ((-1, 0), (1, 0), (0, -1), (0, 1), (-1, -1), (-1, 1), (1, -1), (1, 1)):
            ny, nx = y + dy, x + dx
            if ny < 0 or ny >= H or nx < 0 or nx >= W:
                continue
            if drop[ny, nx] or not platform[ny, nx]:
                continue
            drop[ny, nx] = True
            q.append((ny, nx))

    # keep white / black shoes sitting in the grass zone
    L = 0.2126 * r + 0.7152 * g + 0.0722 * b
    shoe_white = (alpha > 20) & (L > 200) & (np.abs(r.astype(int) - g) < 25)
    shoe_black = (alpha > 20) & (L < 55) & (np.arange(H)[:, None] > int(H * 0.62))
    drop = drop & ~shoe_white & ~shoe_black

    out = a.copy()
    out[drop, 3] = 0

    # tight crop
    ys, xs = np.where(out[..., 3] > 16)
    if ys.size == 0:
        raise SystemExit(f"{name}: strip ate everything")
    pad = 4
    y0, y1 = max(0, ys.min() - pad), min(H, ys.max() + pad + 1)
    x0, x1 = max(0, xs.min() - pad), min(W, xs.max() + pad + 1)
    cropped = Image.fromarray(out[y0:y1, x0:x1])
    cropped.save(dst)
    DBG.mkdir(parents=True, exist_ok=True)
    cropped.save(DBG / dst.name)

    return {
        "name": name,
        "src": list(im.size),
        "out": list(cropped.size),
        "dropped": int(drop.sum()),
        "opaque": int((out[..., 3] > 16).sum()),
    }


def main() -> None:
    reps = []
    reps.append(strip(FOUND / "reggina-cut.png", FOUND / "reggina-live.png", "A"))
    reps.append(strip(FOUND / "reggino-cut.png", FOUND / "reggino-live.png", "O"))
    import json

    print(json.dumps(reps, indent=2))


if __name__ == "__main__":
    main()
