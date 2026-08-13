#!/usr/bin/env python3
"""Extract RegginA / RegginO from the customization screenshots.

The previous cutouts kept the pale customization sky. That sky became
the torn blue plate the user circled on every film clip.

Algorithm:
  1. Crop the character stage (center of the phone screenshot).
  2. Flood-fill SKY-LIKE pixels from the crop edges only.
     Interior whites (sunglasses, bear, shoes) stay.
  3. Second pass: drop remaining *blue* sky trapped between Zakum arms.
     White interiors (L high, chroma low) are not blue — they stay.
  4. Keep the largest opaque connected component (character + island +
     Zakum arms / bear). Drop leftover UI chips.
  5. Tight RGBA crop. Fail closed if leftover sky is still high.
"""
from __future__ import annotations

import json
import sys
from collections import deque
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path("/workspace")
OUT = ROOT / "public" / "brand" / "founders"
DBG = ROOT / "screenshots" / "founders"
OUT.mkdir(parents=True, exist_ok=True)
DBG.mkdir(parents=True, exist_ok=True)

A_SRC = ROOT / "attachments" / "8F00DDDF-D634-486B-8F29-AA3F38B5B090"
O_SRC = ROOT / "attachments" / "97368CF3-B7E7-4E09-9135-7ED0F759996E"

# Wide enough that all 8 Zakum arms stay in the plate.
CROPS = {
    "A": (40, 580, 1480, 1960),
    "O": (180, 380, 1360, 1720),
}


def is_sky(r: np.ndarray, g: np.ndarray, b: np.ndarray) -> np.ndarray:
    """Pale customization sky — cool, bright, not grass / wood / skin."""
    r = r.astype(np.int16)
    g = g.astype(np.int16)
    b = b.astype(np.int16)
    L = 0.2126 * r + 0.7152 * g + 0.0722 * b
    cool = (b >= g - 12) & (b >= r - 8)
    bluish = b > r + 12
    pale = L > 155
    very_pale = L > 210
    grass = (g > r + 18) & (g > b + 8) & (g > 80)
    return ((pale & cool & (bluish | very_pale)) | (very_pale & cool)) & ~grass


def is_blue_sky(r: np.ndarray, g: np.ndarray, b: np.ndarray) -> np.ndarray:
    """Trapped sky between arms. White glasses / bear do NOT match."""
    r = r.astype(np.int16)
    g = g.astype(np.int16)
    b = b.astype(np.int16)
    L = 0.2126 * r + 0.7152 * g + 0.0722 * b
    return (L > 130) & (b > r + 22) & (b >= g - 6)


def flood_from_edges(mask: np.ndarray) -> np.ndarray:
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


def largest_component(keep: np.ndarray) -> np.ndarray:
    H, W = keep.shape
    seen = np.zeros_like(keep, dtype=bool)
    best = np.zeros_like(keep, dtype=bool)
    best_n = 0
    ys, xs = np.where(keep)
    # seed only unchecked pixels
    marked = seen
    for y, x in zip(ys.tolist(), xs.tolist()):
        if marked[y, x]:
            continue
        q = deque([(y, x)])
        cells: list[tuple[int, int]] = []
        marked[y, x] = True
        while q:
            cy, cx = q.popleft()
            cells.append((cy, cx))
            for ny, nx in (
                (cy - 1, cx),
                (cy + 1, cx),
                (cy, cx - 1),
                (cy, cx + 1),
            ):
                if 0 <= ny < H and 0 <= nx < W and keep[ny, nx] and not marked[ny, nx]:
                    marked[ny, nx] = True
                    q.append((ny, nx))
        if len(cells) > best_n:
            best_n = len(cells)
            best = np.zeros_like(keep, dtype=bool)
            for cy, cx in cells:
                best[cy, cx] = True
    return best


def extract(src: Path, box: tuple[int, int, int, int], tag: str) -> dict:
    im = Image.open(src).convert("RGB")
    crop = im.crop(box)
    crop.save(DBG / f"{tag}-stage.jpg", quality=90)
    a = np.array(crop)
    r, g, b = a[:, :, 0], a[:, :, 1], a[:, :, 2]
    leftover = flood_from_edges(is_sky(r, g, b))
    keep = ~leftover
    keep = keep & ~is_blue_sky(r, g, b)
    keep = largest_component(keep)
    rgba = np.dstack([a, np.where(keep, 255, 0).astype(np.uint8)])
    ys, xs = np.where(keep)
    if len(xs) < 400:
        raise SystemExit(f"{tag}: character mass too small ({len(xs)})")
    pad = 6
    x0 = max(0, int(xs.min()) - pad)
    y0 = max(0, int(ys.min()) - pad)
    x1 = min(crop.width, int(xs.max()) + pad + 1)
    y1 = min(crop.height, int(ys.max()) + pad + 1)
    cut = Image.fromarray(rgba).crop((x0, y0, x1, y1))
    ca = np.array(cut)
    opaque = ca[:, :, 3] > 12
    sky2 = is_blue_sky(ca[:, :, 0], ca[:, :, 1], ca[:, :, 2]) & opaque
    ratio = float(sky2.sum()) / max(1, int(opaque.sum()))
    stem = "reggina" if tag == "A" else "reggino"
    cut.save(OUT / f"{stem}-cut.png")
    cut.save(DBG / f"{tag}-cut.png")
    big = cut.resize((cut.width * 2, cut.height * 2), Image.Resampling.NEAREST)
    big.save(OUT / f"{stem}-cut-3x.png")
    return {
        "tag": tag,
        "size": [cut.width, cut.height],
        "opaque": int(opaque.sum()),
        "sky_ratio": round(ratio, 4),
        "aspect": round(cut.width / max(1, cut.height), 3),
    }


def main() -> None:
    if not A_SRC.exists() or not O_SRC.exists():
        raise SystemExit("mannequin screenshots missing")
    a = extract(A_SRC, CROPS["A"], "A")
    o = extract(O_SRC, CROPS["O"], "O")
    fail = []
    if a["sky_ratio"] > 0.04:
        fail.append(f"RegginA leftover sky {a['sky_ratio']:.1%}")
    if o["sky_ratio"] > 0.04:
        fail.append(f"RegginO leftover sky {o['sky_ratio']:.1%}")
    if a["aspect"] < 0.95:
        fail.append(f"RegginA too narrow ({a['size']}) — Zakum arms cropped")
    if a["size"][0] < 480:
        fail.append(f"RegginA plate too small {a['size']}")
    out = {"pass": len(fail) == 0, "A": a, "O": o, "fail": fail}
    print(json.dumps(out, indent=2))
    (DBG / "extract-report.json").write_text(json.dumps(out, indent=2))
    if fail:
        sys.exit(1)


if __name__ == "__main__":
    main()
