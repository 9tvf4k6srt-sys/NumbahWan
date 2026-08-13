#!/usr/bin/env python3
"""
Pixel-perfect N emblem from the guild screenshot.

HARD RULE: the N is the full letter (left stem + diagonal + right stem).
The previous crop (303,76)-(344,144) sliced through the diagonal and
shipped a broken N inside a black rectangle. That must never pass again.

Source geometry (source-guild-ui.png, 1500x691):
  orange columns 305-372, rows 81-149
  left stem  305-319  (full height)
  diagonal   320-356
  right stem 357-372  (full height)
  name "NumbahWan" is WHITE and starts ~x=397 — not part of the mark.
"""
from __future__ import annotations

from pathlib import Path

from PIL import Image

SRC = Path("/workspace/public/brand/source-guild-ui.png")
OUT_EXACT = Path("/workspace/public/brand/n-exact.png")
OUT_PIXEL = Path("/workspace/public/brand/n-pixel.png")
QA = Path("/workspace/screenshots/n-hunt")

# Inclusive source box of the complete N (verified by column histogram).
X0, Y0, X1, Y1 = 305, 81, 373, 150  # x1/y1 exclusive
PAD = 2
SCALE = 8


def is_mark(r: int, g: int, b: int) -> bool:
    """Orange / gold / amber of the in-game N."""
    if r < 140:
        return False
    if r >= g + 12 and b < 130:
        return True
    if r > 200 and 80 < g < 210 and b < 110:
        return True
    return False


def alpha_for(r: int, g: int, b: int) -> int:
    if is_mark(r, g, b):
        return 255
    # Keep warm anti-aliased fringe so stems don't look sawn off.
    if r > 90 and r > g and r > b + 10 and (r + g) > 140:
        t = min(255, int((r - 90) * 2.2))
        return t if t > 40 else 0
    return 0


def main() -> None:
    src = Image.open(SRC).convert("RGBA")
    crop = src.crop((X0, Y0, X1, Y1))
    w, h = crop.size
    px = crop.load()

    out = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    op = out.load()
    xs: list[int] = []
    ys: list[int] = []
    for y in range(h):
        for x in range(w):
            r, g, b, _ = px[x, y]
            a = alpha_for(r, g, b)
            if a > 0:
                op[x, y] = (r, g, b, a)
                xs.append(x)
                ys.append(y)
            else:
                op[x, y] = (0, 0, 0, 0)

    if not xs:
        raise SystemExit("no N pixels found — source or box is wrong")

    tx0 = max(0, min(xs) - PAD)
    ty0 = max(0, min(ys) - PAD)
    tx1 = min(w, max(xs) + 1 + PAD)
    ty1 = min(h, max(ys) + 1 + PAD)
    exact = out.crop((tx0, ty0, tx1, ty1))
    pixel = exact.resize((exact.width * SCALE, exact.height * SCALE), Image.NEAREST)

    OUT_EXACT.parent.mkdir(parents=True, exist_ok=True)
    exact.save(OUT_EXACT)
    pixel.save(OUT_PIXEL)

    QA.mkdir(parents=True, exist_ok=True)
    pixel.save(QA / "n-pixel-final.png")
    # Preview on void so we can judge the crop like the loader does.
    preview = Image.new("RGBA", (pixel.width + 80, pixel.height + 80), (7, 8, 12, 255))
    preview.paste(pixel, (40, 40), pixel)
    preview.save(QA / "n-on-void.png")

    # Stem coverage — left/right 20% must both have mark pixels.
    ew, eh = exact.size
    ep = exact.load()

    def count_mark(x_from: int, x_to: int) -> int:
        n = 0
        for y in range(eh):
            for x in range(x_from, x_to):
                if ep[x, y][3] > 180:
                    n += 1
        return n

    left = count_mark(0, max(1, ew // 5))
    right = count_mark(ew - max(1, ew // 5), ew)
    top = 0
    bot = 0
    for y in range(max(1, eh // 5)):
        for x in range(ew):
            if ep[x, y][3] > 180:
                top += 1
    for y in range(eh - max(1, eh // 5), eh):
        for x in range(ew):
            if ep[x, y][3] > 180:
                bot += 1

    print(
        f"exact={exact.size} pixel={pixel.size} "
        f"left={left} right={right} top={top} bot={bot} "
        f"ratio={ew/eh:.3f}"
    )
    if left < 40 or right < 40:
        raise SystemExit(f"incomplete N — missing stem (left={left} right={right})")
    if top < 20 or bot < 20:
        raise SystemExit(f"incomplete N — missing cap/foot (top={top} bot={bot})")
    if not (0.80 <= ew / eh <= 1.25):
        raise SystemExit(f"N aspect {ew/eh:.3f} is not a full letter")


if __name__ == "__main__":
    main()
