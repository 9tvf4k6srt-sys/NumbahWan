#!/usr/bin/env python3
"""Fail if film posters still carry the customization-sky leftover.

The torn blue plate the user circled was leftover sky from a dirty
cutout, pasted onto every clip. This critic looks at the cutouts AND
at the dark-world posters (void / orbit / hall / raid / climb).

Pass only if:
  1. Founder cutouts have < 4% blue-sky pixels.
  2. Dark posters have no large connected blue-sky blob (> 1.2% of frame).
  3. Cutouts exist and are wide enough for Zakum arms.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path("/workspace")
FOUND = ROOT / "public" / "brand" / "founders"
FILM = ROOT / "public" / "film" / "video"

DARK = [
    "01-void.jpg",
    "02-orbit.jpg",
    "05-hall.jpg",
    "06-raid.jpg",
    "07-climb.jpg",
]


def blue_sky(rgb: np.ndarray) -> np.ndarray:
    r = rgb[:, :, 0].astype(np.int16)
    g = rgb[:, :, 1].astype(np.int16)
    b = rgb[:, :, 2].astype(np.int16)
    L = 0.2126 * r + 0.7152 * g + 0.0722 * b
    return (L > 130) & (b > r + 22) & (b >= g - 6)


def cut_stats(path: Path) -> dict:
    im = Image.open(path).convert("RGBA")
    a = np.array(im)
    opaque = a[:, :, 3] > 12
    sky = blue_sky(a[:, :, :3]) & opaque
    return {
        "w": im.width,
        "h": im.height,
        "sky": round(float(sky.sum()) / max(1, int(opaque.sum())), 4),
        "aspect": round(im.width / max(1, im.height), 3),
    }


def largest_sky_blob(rgb: np.ndarray) -> float:
    """Share of the frame taken by the single biggest blue-sky blob.

    Raid cyan flashes are many tiny spots. The torn customization
    plate was one fat blob. Fail on the blob, not the sparkles.
    """
    sky = blue_sky(rgb)
    if not sky.any():
        return 0.0
    H, W = sky.shape
    seen = np.zeros_like(sky, dtype=bool)
    best = 0
    ys, xs = np.where(sky)
    from collections import deque
    for y, x in zip(ys.tolist(), xs.tolist()):
        if seen[y, x]:
            continue
        q = deque([(y, x)])
        seen[y, x] = True
        n = 0
        while q:
            cy, cx = q.popleft()
            n += 1
            for ny, nx in (
                (cy - 1, cx),
                (cy + 1, cx),
                (cy, cx - 1),
                (cy, cx + 1),
            ):
                if 0 <= ny < H and 0 <= nx < W and sky[ny, nx] and not seen[ny, nx]:
                    seen[ny, nx] = True
                    q.append((ny, nx))
        if n > best:
            best = n
    return best / float(H * W)


def report() -> dict:
    fail = []
    stats: dict = {}
    a = FOUND / "reggina-cut.png"
    o = FOUND / "reggino-cut.png"
    if not a.exists() or not o.exists():
        return {"pass": False, "why": "founder cutouts missing"}
    stats["A"] = cut_stats(a)
    stats["O"] = cut_stats(o)
    if stats["A"]["sky"] > 0.04:
        fail.append(f"RegginA cut leftover sky {stats['A']['sky']:.1%}")
    if stats["O"]["sky"] > 0.04:
        fail.append(f"RegginO cut leftover sky {stats['O']['sky']:.1%}")
    if stats["A"]["aspect"] < 0.95 or stats["A"]["w"] < 480:
        fail.append(f"RegginA plate too tight {stats['A']}")
    posters = {}
    for name in DARK:
        p = FILM / name
        if not p.exists():
            fail.append(f"missing {name}")
            continue
        ratio = largest_sky_blob(np.array(Image.open(p).convert("RGB")))
        posters[name] = round(ratio, 4)
        if ratio > 0.012:
            fail.append(f"{name} blue leftover blob {ratio:.1%} — torn sky plate")
    stats["posters"] = posters
    return {
        "pass": len(fail) == 0,
        "why": "; ".join(fail) if fail else "no leftover sky on cuts or dark posters",
        "stats": stats,
    }


if __name__ == "__main__":
    out = report()
    print(json.dumps(out))
    sys.exit(0 if out["pass"] else 1)
