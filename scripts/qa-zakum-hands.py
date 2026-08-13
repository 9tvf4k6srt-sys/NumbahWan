#!/usr/bin/env python3
"""Fail-closed: Zakum arms stay on RegginA for the WHOLE clip.

Samples 5 timestamps per video. A slam that deletes arms fails.
A climb where she has no fan fails. One pretty poster is not enough.
"""
from __future__ import annotations

import json
import subprocess
import sys
import tempfile
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

ROOT = Path("/workspace")
VIDEO = ROOT / "public" / "film" / "video"
FF = "/usr/local/bin/ffmpeg"
SAMPLES = (0.25, 1.5, 3.0, 4.5, 5.55)
CLIPS = [
    "02-orbit",
    "03-field",
    "04-forest",
    "05-hall",
    "06-raid",
    "07-climb",
    "08-invite",
]
# Raid/climb are the ones that historically dropped arms mid-clip.
STRICT = {"06-raid", "07-climb", "05-hall"}


def grab(clip: str, t: float, dest: Path) -> bool:
    src = VIDEO / f"{clip}.mp4"
    if not src.exists():
        return False
    try:
        subprocess.check_call(
            [FF, "-y", "-ss", f"{t:.2f}", "-i", str(src), "-frames:v", "1", "-q:v", "3", str(dest)],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
        return dest.exists() and dest.stat().st_size > 1000
    except subprocess.CalledProcessError:
        return False


def load(path: Path) -> np.ndarray:
    return np.asarray(Image.open(path).convert("RGB"), dtype=np.uint8)


def blonde_center(rgb: np.ndarray) -> tuple[int, int] | None:
    r, g, b = [rgb[..., i].astype(np.int16) for i in range(3)]
    hair = (r > 170) & (g > 140) & (b < 120) & ((r - b) > 70) & ((g - b) > 40)
    ys, xs = np.where(hair)
    if len(xs) < 80:
        # looser — some plates run cooler
        hair = (r > 155) & (g > 125) & (b < 140) & ((r - b) > 45)
        ys, xs = np.where(hair)
    if len(xs) < 80:
        return None
    return int(np.median(xs)), int(np.median(ys))


def brown_mask(rgb: np.ndarray) -> np.ndarray:
    r, g, b = [rgb[..., i].astype(np.int16) for i in range(3)]
    warm = (r > 78) & (r > b + 18) & (g > 48) & (g < r + 8) & (b < 120)
    not_skin = ~((r > 145) & (g > 95) & (g < 175) & (b > 65) & ((r - g) < 50))
    not_gold = ~((r > 195) & (g > 155) & (b < 95))
    not_leaf = ~((r > 160) & (g < 110) & (b < 80) & ((r - g) > 45))
    return warm & not_skin & not_gold & not_leaf


def components(mask: np.ndarray, min_px: int) -> list[dict]:
    H, W = mask.shape
    seen = np.zeros_like(mask, dtype=np.uint8)
    out = []
    ys, xs = np.where(mask)
    for y, x in zip(ys, xs):
        if seen[y, x]:
            continue
        stack = [(y, x)]
        seen[y, x] = 1
        pts = []
        while stack:
            cy, cx = stack.pop()
            pts.append((cy, cx))
            for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                ny, nx = cy + dy, cx + dx
                if 0 <= ny < H and 0 <= nx < W and mask[ny, nx] and not seen[ny, nx]:
                    seen[ny, nx] = 1
                    stack.append((ny, nx))
        if len(pts) < min_px:
            continue
        yy = np.array([p[0] for p in pts])
        xx = np.array([p[1] for p in pts])
        x0, y0, x1, y1 = int(xx.min()), int(yy.min()), int(xx.max()) + 1, int(yy.max()) + 1
        w, h = x1 - x0, y1 - y0
        out.append(
            {
                "area": len(pts),
                "cx": float(xx.mean()),
                "cy": float(yy.mean()),
                "w": w,
                "h": h,
                "aspect": max(w, h) / max(1, min(w, h)),
                "fill": len(pts) / max(1, w * h),
            }
        )
    return out


def tip_energy(rgb: np.ndarray, blob: dict, ax: float, ay: float) -> float:
    # Approximate crop from blob center
    x0 = max(0, int(blob["cx"] - blob["w"] / 2))
    y0 = max(0, int(blob["cy"] - blob["h"] / 2))
    x1 = min(rgb.shape[1], x0 + blob["w"])
    y1 = min(rgb.shape[0], y0 + blob["h"])
    crop = rgb[y0:y1, x0:x1]
    if crop.size == 0:
        return 0.0
    gray = np.asarray(
        Image.fromarray(crop).convert("L").filter(ImageFilter.FIND_EDGES),
        dtype=np.float32,
    )
    hh, ww = gray.shape
    yy, xx = np.mgrid[0:hh, 0:ww]
    vx, vy = blob["cx"] - ax, blob["cy"] - ay
    proj = (xx - ww / 2) * vx + (yy - hh / 2) * vy
    if proj.max() - proj.min() < 1:
        return 0.0
    far = proj > (proj.min() + 0.62 * (proj.max() - proj.min()))
    near = proj < (proj.min() + 0.38 * (proj.max() - proj.min()))
    if far.sum() < 8 or near.sum() < 8:
        return 0.0
    tip = float(gray[far].mean())
    shaft = float(gray[near].mean()) + 1e-3
    return (tip / shaft) * (1.0 + float(gray[far].std()) / 36.0)


def analyze(path: Path) -> dict:
    rgb = load(path)
    H, W = rgb.shape[:2]
    center = blonde_center(rgb)
    if center is None:
        return {"error": "no blonde lock", "size": f"{W}x{H}", "aspect": round(W / max(1, H), 3)}
    ax, ay = center
    rad_x = int(W * 0.42)
    rad_y = int(H * 0.34)
    x0, x1 = max(0, ax - rad_x), min(W, ax + rad_x)
    y0, y1 = max(0, ay - int(rad_y * 0.7)), min(H, ay + rad_y)
    local = rgb[y0:y1, x0:x1]
    mask = brown_mask(local)
    blobs = components(mask, min_px=max(70, (local.shape[0] * local.shape[1]) // 1600))
    lx, ly = ax - x0, ay - y0
    around = []
    for b in blobs:
        dist = ((b["cx"] - lx) ** 2 + (b["cy"] - ly) ** 2) ** 0.5
        if dist < 16:
            continue
        around.append(b)
    limbs = [b for b in around if b["aspect"] >= 1.45 or (b["aspect"] >= 1.22 and b["fill"] < 0.62)]
    hands = []
    for b in limbs:
        s = tip_energy(local, b, lx, ly)
        if s >= 1.12:
            hands.append(round(s, 2))
    return {
        "path": str(path),
        "size": f"{W}x{H}",
        "aspect": round(W / max(1, H), 3),
        "blonde": [ax, ay],
        "limbs": len(limbs),
        "hands": len(hands),
    }


def verdict(s: dict, clip: str) -> list[str]:
    if "error" in s:
        return [s["error"]]
    fail = []
    if s["aspect"] > 0.78:
        fail.append(f"not 9:16 ({s['aspect']})")
    need = 6 if clip in STRICT else 5
    if s["limbs"] < need:
        fail.append(f"only {s['limbs']} limb-like arms (need ≥{need})")
    if s["hands"] < 3:
        fail.append(f"only {s['hands']} distal hands-with-fingers (need ≥3)")
    return fail


def report(paths: list[Path] | None = None) -> dict:
    fail: list[str] = []
    stats: dict = {}
    if paths:
        for p in paths:
            s = analyze(p)
            stats[p.stem] = s
            why = verdict(s, p.stem)
            if why:
                fail.extend(f"{p.stem}: {w}" for w in why)
        return {
            "pass": len(fail) == 0,
            "why": "; ".join(fail) if fail else "arms stay on her",
            "stats": stats,
        }

    with tempfile.TemporaryDirectory(prefix="zakum-qa-") as tmp:
        tmp_p = Path(tmp)
        for clip in CLIPS:
            clip_fail = []
            clip_stats = []
            src = VIDEO / f"{clip}.mp4"
            if not src.exists():
                fail.append(f"{clip}: no video")
                continue
            for t in SAMPLES:
                dest = tmp_p / f"{clip}_{t:.2f}.jpg"
                if not grab(clip, t, dest):
                    clip_fail.append(f"t={t} grab failed")
                    continue
                s = analyze(dest)
                clip_stats.append(s)
                why = verdict(s, clip)
                if why:
                    clip_fail.extend(f"t={t} {w}" for w in why)
            stats[clip] = clip_stats
            if clip_fail:
                fail.extend(f"{clip}: {w}" for w in clip_fail)
    return {
        "pass": len(fail) == 0,
        "why": "; ".join(fail) if fail else "six arms hold for the whole clip",
        "stats": stats,
    }


if __name__ == "__main__":
    extra = [Path(a) for a in sys.argv[1:]]
    out = report(extra or None)
    print(json.dumps(out, ensure_ascii=False, indent=2))
    sys.exit(0 if out["pass"] else 1)
