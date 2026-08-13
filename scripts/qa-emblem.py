#!/usr/bin/env python3
"""
Matt Shumer critic for the N emblem.

A crop that is missing a stem, sitting on a black plate, or forced into a
tall sliver MUST fail. The previous checker only asked "is the filename
n-pixel.png?" — that is how a chopped N shipped.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

from PIL import Image

PIXEL = Path("/workspace/public/brand/n-pixel.png")
EXACT = Path("/workspace/public/brand/n-exact.png")


def fail(why: str, **extra) -> None:
    print(json.dumps({"pass": False, "why": why, **extra}))
    sys.exit(1)


def stem_mass(im: Image.Image, x0: float, x1: float) -> int:
    w, h = im.size
    px = im.load()
    n = 0
    xa, xb = int(w * x0), int(w * x1)
    for y in range(h):
        for x in range(xa, xb):
            r, g, b, a = px[x, y]
            if a > 180 and r > 150 and r > g:
                n += 1
    return n


def main() -> None:
    if not PIXEL.exists():
        fail("n-pixel.png missing")
    im = Image.open(PIXEL)
    if im.mode != "RGBA":
        fail("n-pixel must be RGBA (transparent ground, not a black plate)", mode=im.mode)
    w, h = im.size
    ratio = w / h
    if ratio < 0.82 or ratio > 1.22:
        fail("N aspect is not a full letter — crop is a sliver", width=w, height=h, ratio=round(ratio, 3))
    if w < 200 or h < 200:
        fail("N is too small to display crisply", width=w, height=h)

    left = stem_mass(im, 0.0, 0.22)
    right = stem_mass(im, 0.78, 1.0)
    mid = stem_mass(im, 0.35, 0.65)
    if left < 800:
        fail("left stem missing or cropped", left=left, right=right)
    if right < 800:
        fail("right stem missing or cropped — this is the bug we shipped", left=left, right=right)
    if mid < 200:
        fail("diagonal missing", mid=mid)

    px = im.load()
    opaque = 0
    trans = 0
    black_plate = 0
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a < 16:
                trans += 1
            else:
                opaque += 1
                if r < 40 and g < 40 and b < 40:
                    black_plate += 1
    if trans < opaque * 0.15:
        fail("background is not transparent — black plate around the N", trans=trans, opaque=opaque)
    if black_plate > opaque * 0.08:
        fail("too many near-black opaque pixels — leftover UI plate", black_plate=black_plate, opaque=opaque)

    if EXACT.exists():
        ex = Image.open(EXACT)
        er = ex.size[0] / ex.size[1]
        if er < 0.82 or er > 1.22:
            fail("n-exact aspect broken", exact=list(ex.size), ratio=round(er, 3))

    print(
        json.dumps(
            {
                "pass": True,
                "width": w,
                "height": h,
                "ratio": round(ratio, 3),
                "left": left,
                "right": right,
                "mid": mid,
                "trans": trans,
                "opaque": opaque,
            }
        )
    )


if __name__ == "__main__":
    main()
