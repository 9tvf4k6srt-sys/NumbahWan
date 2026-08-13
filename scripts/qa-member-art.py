#!/usr/bin/env python3
"""Harsh gate for member portraits.

Screenshot crops, tiny files, identical cards, missing name-art,
or a hat that does not match the in-game tile do not ship.
阿光Yo in a military feather cap must fail. Exit 0 only if
every card would wow a blind critic who has the roster tile.
"""
from __future__ import annotations

import json
import shutil
import sys
from pathlib import Path

from PIL import Image
import numpy as np

ROOT = Path("/workspace")
ART = ROOT / "public" / "brand" / "portraits"
ROSTER = ROOT / "public" / "brand" / "roster"
MEMBERS = ROOT / "src" / "lib" / "members.ts"
COPY = ROOT / "src" / "lib" / "copy.ts"
WALL = ROOT / "src" / "components" / "cinematic" / "house-wall.tsx"
BRIEF = ROOT / ".grok" / "research" / "vault" / "member-art.md"

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

MIN_W, MIN_H = 1024, 1280
MIN_KB = 180
MIN_PAIR_MSE = 280.0


def fingerprint(im: Image.Image) -> np.ndarray:
    return np.asarray(im.convert("RGB").resize((32, 32)), dtype=np.float32)


def arr(im: Image.Image, size: tuple[int, int] = (240, 320)) -> np.ndarray:
    return np.asarray(im.convert("RGB").resize(size), dtype=np.float32)


def frac(mask: np.ndarray) -> float:
    return float(mask.mean()) if mask.size else 0.0


def knit_blue(a: np.ndarray) -> np.ndarray:
    r, g, b = a[:, :, 0], a[:, :, 1], a[:, :, 2]
    lum = (r + g + b) / 3.0
    sat = np.maximum(np.maximum(r, g), b) - np.minimum(np.minimum(r, g), b)
    # Wool beanie: mid-chroma blue. Pale sky and navy visors fail this.
    return (
        (b > 105)
        & (b > r + 22)
        & (g > 80)
        & (g < 185)
        & (r < 155)
        & (lum > 85)
        & (lum < 175)
        & (sat > 40)
    )


def white_pom(a: np.ndarray) -> np.ndarray:
    r, g, b = a[:, :, 0], a[:, :, 1], a[:, :, 2]
    return (r > 200) & (g > 200) & (b > 200) & (np.abs(r - g) < 28) & (np.abs(g - b) < 28)


def santa_red(a: np.ndarray) -> np.ndarray:
    r, g, b = a[:, :, 0], a[:, :, 1], a[:, :, 2]
    return (r > 140) & (r > g + 35) & (r > b + 40)


def gold_badge(a: np.ndarray) -> np.ndarray:
    r, g, b = a[:, :, 0], a[:, :, 1], a[:, :, 2]
    return (r > 180) & (g > 140) & (r > b + 40) & (g > b + 20)


def check_aguang(im: Image.Image) -> list[str]:
    """Costume lock from the live roster tile.

    阿光Yo is a girl in a blue yarn beanie with a white pom-pom
    and a red Santa coat. A boy in a peaked cap with a feather
    must never pass.
    """
    a = arr(im)
    h, w, _ = a.shape
    hat = a[int(h * 0.06) : int(h * 0.42), int(w * 0.20) : int(w * 0.80)]
    pom = a[0 : int(h * 0.22), int(w * 0.28) : int(w * 0.72)]
    body = a[int(h * 0.42) : int(h * 0.92), int(w * 0.12) : int(w * 0.88)]
    top = a[: int(h * 0.40)]
    fail = []
    blue = frac(knit_blue(hat))
    pom_f = frac(white_pom(pom))
    red = frac(santa_red(body))
    gold = frac(gold_badge(hat))
    # A sunburst + feather card is mostly white-yellow on top and has
    # almost no wool-blue on the head.
    if blue < 0.045:
        fail.append(f"aguang hat is not a blue knit beanie (blue={blue:.3f})")
    if pom_f < 0.012 or pom_f > 0.62:
        fail.append(f"aguang missing white yarn pom-pom (pom={pom_f:.3f})")
    if red < 0.035:
        fail.append(f"aguang missing Santa red coat (red={red:.3f})")
    if gold > 0.045:
        fail.append(f"aguang looks like a gold military badge (gold={gold:.3f})")
    # Feather plume: tall bright streak in the upper-right, not a pom.
    right = top[:, int(w * 0.62) :]
    bright = (right.min(axis=2) > 205) & ((right.max(axis=2) - right.min(axis=2)) < 32)
    if frac(bright) > 0.16 and blue < 0.08:
        fail.append("aguang hat looks like a feather plume, not a pom beanie")
    return fail


def check_source_text() -> list[str]:
    fail = []
    if not BRIEF.exists():
        fail.append("member-art brief missing")
    else:
        brief = BRIEF.read_text(encoding="utf-8")
        if "costume brief" not in brief:
            fail.append("brief does not ban screenshot tiles")
        if "毛線" not in brief or "毛球" not in brief or "聖誕" not in brief:
            fail.append("brief missing 阿光Yo hat lock (毛線/毛球/聖誕)")
        if "蕾與摩" not in brief or "傻瓜小孩" not in brief:
            fail.append("brief missing name locks")
    src = MEMBERS.read_text(encoding="utf-8") if MEMBERS.exists() else ""
    if "captionZh" not in src or "先存檔" not in src:
        fail.append("members.ts missing human captions")
    if "thumb" not in src or "/thumbs/" not in src:
        fail.append("members.ts missing rail thumbs — full 1200px in the rail kills iOS")
    if "第一" in src:
        fail.append("第一 in member copy")
    if "他當得起" in src:
        fail.append("aguang caption still uses 他 — she is a girl")
    copy = COPY.read_text(encoding="utf-8") if COPY.exists() else ""
    wall = WALL.read_text(encoding="utf-8") if WALL.exists() else ""
    if "m.thumb" not in wall:
        fail.append("house-wall rail is not using thumbs")
    banned = ("還有 6", "6 seats left", "這六格", "These six are open", "data-empty-seat")
    blob = copy + wall
    for token in banned:
        if token in blob:
            fail.append(f"empty-seat leftover: {token}")
    return fail


def report(art_dir: Path = ART) -> dict:
    fail = check_source_text()

    colors = []
    for slug in SLUGS:
        path = art_dir / f"{slug}.jpg"
        thumb = art_dir / "thumbs" / f"{slug}.jpg"
        if not path.exists():
            fail.append(f"missing {slug}.jpg")
            continue
        if not thumb.exists():
            fail.append(f"missing thumb {slug}.jpg")
        elif thumb.stat().st_size > 80 * 1024:
            fail.append(f"{slug} thumb too heavy {thumb.stat().st_size}b")
        if path.stat().st_size < MIN_KB * 1024:
            fail.append(f"{slug} too small {path.stat().st_size}b")
        im = Image.open(path)
        w, h = im.size
        if w < MIN_W or h < MIN_H:
            fail.append(f"{slug} low-res {w}x{h}")
        ratio = w / max(1, h)
        if ratio < 0.68 or ratio > 0.82:
            fail.append(f"{slug} not 3:4 ({w}x{h})")
        colors.append((slug, fingerprint(im)))
        pix = np.asarray(im.convert("RGB").resize((80, 100)), dtype=np.float32)
        top = pix[:12]
        g = top[:, :, 1].mean()
        r = top[:, :, 0].mean()
        b = top[:, :, 2].mean()
        if g > 160 and g > r + 40 and g > b + 20:
            fail.append(f"{slug} looks like an Online pill crop")
        if slug == "aguang":
            fail.extend(check_aguang(im))

    for i, (a, ca) in enumerate(colors):
        for b, cb in colors[i + 1 :]:
            mse = float(((ca - cb) ** 2).mean())
            if mse < MIN_PAIR_MSE:
                fail.append(f"{a} near-duplicate of {b} mse={mse:.1f}")

    return {
        "pass": len(fail) == 0,
        "why": "; ".join(fail) if fail else f"{len(SLUGS)} unique hi-res portraits, hats locked",
        "count": len(list(art_dir.glob("*.jpg"))),
        "fail": fail,
    }


if __name__ == "__main__":
    # Optional: prove the old feather-cap file fails when passed as argv.
    if len(sys.argv) > 1 and sys.argv[1] == "--probe-old":
        old = Path(sys.argv[2])
        im = Image.open(old)
        hits = check_aguang(im)
        print(json.dumps({"old_fails": bool(hits), "why": hits}, ensure_ascii=False))
        sys.exit(0 if hits else 1)
    out = report()
    print(json.dumps({k: out[k] for k in ("pass", "why", "count")}, ensure_ascii=False))
    sys.exit(0 if out["pass"] else 1)
