#!/usr/bin/env python3
"""Composite the REAL mannequin pixels onto the film.

RegginA glasses + all 8 Zakum arms never get redrawn.
RegginO + bear never get redrawn.
Sprites sit in the lower third so they never cover the N.
Motion is a bob/hop of the original pixels only.
"""
from __future__ import annotations

import math
import subprocess
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter, ImageDraw

ROOT = Path("/workspace")
FOUND = ROOT / "public" / "brand" / "founders"
ART = Path("/workspace/artifacts/imagine_videos")
PREP = Path("/tmp/film-prep")
OUT = ROOT / "public" / "film" / "video"
STILL = ROOT / "public" / "film" / "stills"
FF = "/usr/local/bin/ffmpeg"

PREP.mkdir(parents=True, exist_ok=True)
OUT.mkdir(parents=True, exist_ok=True)
STILL.mkdir(parents=True, exist_ok=True)

A_SRC = FOUND / "reggina-cut.png"
O_SRC = FOUND / "reggino-cut.png"

BG = {
    "01-void": "7481cd61-5735-4257-8cda-9eeaeaae27de",
    "02-orbit": "6b9008ee-b2bc-4043-b9f8-a5a1b84cd1d7",
    "03-field": "c9504e6b-18de-468e-bc7a-367ef04fd3cd",
    "04-forest": "31bbef55-4960-402a-ac6f-93c48315ca35",
    "05-hall": "ec809dc7-1bb5-4b94-8489-8ee727a80b1a",
    "06-raid": "7af63a34-04ad-46b4-8817-53d757a893af",
    "07-climb": "c425c03a-3e48-4483-9770-27a7b3f41714",
    "08-invite": "1284e55f-43d2-4a31-82e5-a70afae5ed17",
}

# Lower-third placements. The N lives in the upper/center of orbit + invite.
PLACES = {
    "02-orbit": {
        "A": {"x": 8, "y": 430, "w": 400, "bob": 4, "hop": 0},
        "O": {"x": 880, "y": 425, "w": 380, "bob": 3, "hop": 0},
    },
    "03-field": {
        "A": {"x": 20, "y": 380, "w": 460, "bob": 5, "hop": 0},
        "O": {"x": 780, "y": 385, "w": 440, "bob": 4, "hop": 0},
    },
    "04-forest": {
        "A": {"x": 40, "y": 390, "w": 440, "bob": 4, "hop": 0},
        "O": {"x": 760, "y": 395, "w": 420, "bob": 4, "hop": 0},
    },
    "05-hall": {
        "A": {"x": 180, "y": 370, "w": 400, "bob": 3, "hop": 0},
        "O": {"x": 700, "y": 375, "w": 380, "bob": 3, "hop": 0},
    },
    "06-raid": {
        "A": {"x": 80, "y": 300, "w": 520, "bob": 2, "hop": 18},
        "O": {"x": 760, "y": 360, "w": 400, "bob": 4, "hop": 0},
    },
    "07-climb": {
        "A": {"x": 280, "y": 280, "w": 380, "bob": 3, "hop": 7},
        "O": {"x": 680, "y": 340, "w": 360, "bob": 3, "hop": 5},
    },
    "08-invite": {
        "A": {"x": 16, "y": 400, "w": 420, "bob": 4, "hop": 0},
        "O": {"x": 860, "y": 405, "w": 400, "bob": 4, "hop": 0},
    },
}

FPS = 24
W, H = 1280, 720


def ff(*args):
    subprocess.check_call([FF, "-y", *args], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)


def load_sprite(path: Path, width: int) -> Image.Image:
    im = Image.open(path).convert("RGBA")
    a = np.array(im)
    ys, xs = np.where(a[:, :, 3] > 12)
    if len(xs) == 0:
        return im
    im = Image.fromarray(a).crop(
        (int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1)
    )
    nh = max(1, round(im.height * (width / im.width)))
    return im.resize((width, nh), Image.Resampling.NEAREST)


def paste(dst: Image.Image, spr: Image.Image, x: int, y: int) -> None:
    sh = Image.new("RGBA", (spr.width, 18), (0, 0, 0, 0))
    d = ImageDraw.Draw(sh)
    d.ellipse((8, 2, spr.width - 8, 16), fill=(0, 0, 0, 90))
    sh = sh.filter(ImageFilter.GaussianBlur(3))
    dst.alpha_composite(sh, (max(0, x), min(H - 18, y + spr.height - 10)))
    dst.alpha_composite(spr, (x, y))


def prep_bg(name: str, vid_id: str) -> Path:
    dest = PREP / f"{name}-bg.mp4"
    if dest.exists() and dest.stat().st_size > 1000:
        return dest
    src = ART / f"{vid_id}.mp4"
    ff(
        "-i",
        str(src),
        "-t",
        "5.85",
        "-vf",
        "fps=24,crop=iw*0.90:ih*0.88:iw*0.05:ih*0.04,scale=1280:720:flags=lanczos,setsar=1",
        "-c:v",
        "libx264",
        "-preset",
        "veryfast",
        "-crf",
        "16",
        "-pix_fmt",
        "yuv420p",
        "-an",
        str(dest),
    )
    return dest


def overlay_clip(name: str) -> Path:
    bg = PREP / f"{name}-bg.mp4"
    frames_dir = PREP / f"{name}-frames"
    frames_dir.mkdir(exist_ok=True)
    existing = list(frames_dir.glob("f*.png"))
    if len(existing) < 100:
        ff("-i", str(bg), "-vsync", "0", str(frames_dir / "f%04d.png"))

    places = PLACES[name]
    spr_a = load_sprite(A_SRC, places["A"]["w"])
    spr_o = load_sprite(O_SRC, places["O"]["w"])
    spr_a.save(FOUND / "reggina-film.png")
    spr_o.save(FOUND / "reggino-film.png")

    files = sorted(frames_dir.glob("f*.png"))
    for i, fp in enumerate(files):
        t = i / FPS
        frame = Image.open(fp).convert("RGBA")
        # If this frame was already overlaid in a previous run it still
        # has leftover sky. Always start from the raw bg frame: we
        # re-extract from the mp4 when the folder is stale, otherwise
        # we composite onto whatever is there. To be safe, re-read from
        # a sibling raw cache if present.
        for key, spr in (("A", spr_a), ("O", spr_o)):
            p = places[key]
            phase = 0.0 if key == "A" else 1.1
            bob = p["bob"] * math.sin(2 * math.pi * t / 1.45 + phase)
            hop = p["hop"] * abs(math.sin(math.pi * t / 1.7 + phase))
            x = int(p["x"])
            y = int(p["y"] - bob - hop)
            # keep the sprite on screen
            y = min(y, H - spr.height + 8)
            paste(frame, spr, x, y)
        frame.convert("RGB").save(fp, quality=95)

    stacked = PREP / f"{name}-stacked.mp4"
    ff(
        "-framerate",
        "24",
        "-i",
        str(frames_dir / "f%04d.png"),
        "-c:v",
        "libx264",
        "-preset",
        "veryfast",
        "-crf",
        "16",
        "-pix_fmt",
        "yuv420p",
        "-an",
        str(stacked),
    )
    return stacked


def encode_intra(src: Path, dest: Path) -> None:
    ff(
        "-i",
        str(src),
        "-c:v",
        "libx264",
        "-preset",
        "fast",
        "-crf",
        "26",
        "-g",
        "1",
        "-keyint_min",
        "1",
        "-sc_threshold",
        "0",
        "-bf",
        "0",
        "-pix_fmt",
        "yuv420p",
        "-movflags",
        "+faststart",
        "-an",
        str(dest),
    )
    poster = dest.with_suffix(".jpg")
    ff("-ss", "0.12", "-i", str(dest), "-frames:v", "1", "-q:v", "3", str(poster))


def main() -> None:
    assert A_SRC.exists() and O_SRC.exists()
    # persist the wide Zakum plate for the harness
    Image.open(A_SRC).save(FOUND / "reggina-body.png")
    Image.open(O_SRC).save(FOUND / "reggino-body.png")

    prep_bg("01-void", BG["01-void"])
    encode_intra(PREP / "01-void-bg.mp4", OUT / "01-void.mp4")

    for name in (
        "02-orbit",
        "03-field",
        "04-forest",
        "05-hall",
        "06-raid",
        "07-climb",
        "08-invite",
    ):
        print("overlay", name, flush=True)
        # Always rebuild frames from the clean world plate.
        frames_dir = PREP / f"{name}-frames"
        if frames_dir.exists():
            for p in frames_dir.glob("f*.png"):
                p.unlink()
        prep_bg(name, BG[name])
        stacked = overlay_clip(name)
        encode_intra(stacked, OUT / f"{name}.mp4")

    mapping = {
        "01-void": "void.jpg",
        "02-orbit": "emblem.jpg",
        "03-field": "field.jpg",
        "04-forest": "forest.jpg",
        "05-hall": "hall.jpg",
        "06-raid": "raid.jpg",
        "07-climb": "climb.jpg",
        "08-invite": "invite.jpg",
    }
    for k, v in mapping.items():
        src = OUT / f"{k}.jpg"
        if src.exists():
            (STILL / v).write_bytes(src.read_bytes())

    man = OUT / "manifest.txt"
    lines = []
    for name in mapping:
        p = OUT / f"{name}.mp4"
        lines.append(f"{name} 00:00:05.83 {p.stat().st_size}")
    man.write_text("\n".join(lines) + "\n")
    print("done")


if __name__ == "__main__":
    main()
