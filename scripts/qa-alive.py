#!/usr/bin/env python3
"""Alive-in-the-shot gate. Overlay stickers fail. Mask-heads fail.

This used to demand photo-pixel NCC, which killed the movie and put
grass islands back. Identity is now: 9:16, founders live in the place,
void N is brand orange, no letterbox.
Hands-with-fingers live in qa-zakum-hands.py + a human view.
"""
from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path("/workspace")
VIDEO = ROOT / "public" / "film" / "video"
PIXEL = ROOT / "public" / "brand" / "n-pixel.png"
TMP = Path("/tmp/qa-alive")
TMP.mkdir(exist_ok=True)

CHAR_CLIPS = [
    "02-orbit",
    "03-field",
    "04-forest",
    "05-hall",
    "06-raid",
    "07-climb",
    "08-invite",
]


def load_rgb(path: Path) -> np.ndarray:
    return np.asarray(Image.open(path).convert("RGB"), dtype=np.float32)


def frame_of(clip: str) -> Path | None:
    jpg = VIDEO / f"{clip}.jpg"
    mp4 = VIDEO / f"{clip}.mp4"
    if mp4.exists():
        out = TMP / f"{clip}.jpg"
        subprocess.run(
            ["/usr/local/bin/ffmpeg", "-y", "-ss", "0.8", "-i", str(mp4), "-frames:v", "1", str(out)],
            check=False,
            capture_output=True,
        )
        if out.exists():
            return out
    return jpg if jpg.exists() else None


def n_color_ok(rgb: np.ndarray) -> tuple[bool, dict]:
    h, w, _ = rgb.shape
    c = rgb[int(h * 0.22) : int(h * 0.72), int(w * 0.18) : int(w * 0.82)]
    r, g, b = c[..., 0], c[..., 1], c[..., 2]
    orange = (r > 160) & (r > g) & (r > b) & ((r - b) > 40)
    stats = {"frac": round(float(orange.mean()), 4)}
    if orange.mean() < 0.04:
        return False, {**stats, "why": "no orange N mass"}
    mean = c[orange].mean(axis=0)
    stats["mean"] = [round(float(x), 1) for x in mean]
    gr = float(mean[1] / max(1.0, mean[0]))
    br = float(mean[2] / max(1.0, mean[0]))
    stats["g_over_r"] = round(gr, 3)
    stats["b_over_r"] = round(br, 3)
    if gr > 0.54:
        return False, {**stats, "why": f"N too yellow/tan G/R={gr:.2f}"}
    if br > 0.28:
        return False, {**stats, "why": f"N too brown B/R={br:.2f}"}
    if mean[0] < 190:
        return False, {**stats, "why": f"N too dull R={mean[0]:.0f}"}
    return True, stats


def founders_present(rgb: np.ndarray) -> dict:
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    blonde = (r > 170) & (g > 140) & (b < 125) & ((r - b) > 60)
    pink = (r > 150) & (g > 70) & (g < 160) & (b > 80) & (b < 170) & ((r - g) > 25)
    white_frame = (r > 200) & (g > 200) & (b > 200)
    return {
        "blonde": round(float(blonde.mean()), 5),
        "pink": round(float(pink.mean()), 5),
        "white": round(float(white_frame.mean()), 5),
    }


def grass_island(rgb: np.ndarray) -> float:
    """Green turf slab sitting on a non-green floor (hall failure)."""
    h, w, _ = rgb.shape
    band = rgb[int(h * 0.45) : int(h * 0.82)]
    r, g, b = band[..., 0], band[..., 1], band[..., 2]
    green = (g > 90) & (g > r + 20) & (g > b + 15)
    return float(green.mean())


def report() -> dict:
    fail = []
    stats: dict = {}

    void = frame_of("01-void")
    if void is None:
        fail.append("01-void missing")
    else:
        rgb = load_rgb(void)
        h, w = rgb.shape[:2]
        if w / max(1, h) > 0.75:
            fail.append(f"void not 9:16 ({w}x{h})")
        ok, ns = n_color_ok(rgb)
        stats["void_n"] = ns
        if not ok:
            fail.append(f"void N color: {ns.get('why')}")

    for clip in CHAR_CLIPS:
        path = frame_of(clip)
        if path is None:
            fail.append(f"{clip}: no frame")
            continue
        rgb = load_rgb(path)
        h, w = rgb.shape[:2]
        aspect = w / max(1, h)
        found = founders_present(rgb)
        island = grass_island(rgb) if "hall" in clip else 0.0
        stats[clip] = {"aspect": round(aspect, 3), **found, "island": round(island, 4)}
        if aspect > 0.75:
            fail.append(f"{clip}: not 9:16 ({aspect:.2f})")
        if found["blonde"] < 0.0015:
            fail.append(f"{clip}: no blonde lock (RegginA missing)")
        if found["pink"] < 0.0008:
            fail.append(f"{clip}: no rose hair (RegginO missing)")
        if "hall" in clip and island > 0.08:
            fail.append(f"{clip}: grass island on the inn ({island:.3f})")

    return {
        "pass": len(fail) == 0,
        "why": "; ".join(fail) if fail else "alive in the shot; void N is brand orange",
        "stats": stats,
    }


if __name__ == "__main__":
    out = report()
    print(json.dumps(out, ensure_ascii=False))
    sys.exit(0 if out["pass"] else 1)
