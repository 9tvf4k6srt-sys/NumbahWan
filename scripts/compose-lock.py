#!/usr/bin/env python3
"""Lock real founder pixels + the brand N into 9:16 world plates.

Worlds are empty. Characters are the mannequin cutouts (no studio island).
The N is /brand/n-pixel.png — never a generated clay letter.
Ken Burns + a 4px bob so the film still moves.
"""
from __future__ import annotations

import math
import subprocess
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

ROOT = Path("/workspace")
ART = ROOT / "artifacts" / "imagine_images"
FOUND = ROOT / "public" / "brand" / "founders"
N_PATH = ROOT / "public" / "brand" / "n-pixel.png"
OUT = ROOT / "public" / "film" / "video"
STILL = ROOT / "public" / "film" / "stills"
PREVIEW = ROOT / "screenshots" / "lock"
PREP = Path("/tmp/film-lock")
FF = "/usr/local/bin/ffmpeg"

W, H = 720, 1280
FPS = 24
FRAMES = 144  # 6.0s

WORLDS = {
    "01-void": ART / "b1ee8018-0796-4543-95bf-8ea37da9aad9.jpg",
    "02-orbit": ART / "29bf4274-b086-4056-8a3e-091689337720.jpg",
    "03-field": ART / "3d245572-9c84-43fe-84a4-883bc9b56f26.jpg",
    "04-forest": ART / "0da9efdb-f9db-48be-9c5d-7dfefed15449.jpg",
    "05-hall": ART / "be49e956-5be6-4fbe-beb3-3276947d43c7.jpg",
    "06-raid": ART / "2c00da3a-ad7a-4637-b697-6c4df883c7b0.jpg",
    "07-climb": ART / "8c4517a8-f2fe-4d6a-a271-2eb8334bdc3e.jpg",
    "08-invite": ART / "e789902d-e4f2-4136-bc8a-0e7bb80eb7d8.jpg",
}

# x, y, w — y is TOP of the sprite on the 720x1280 canvas
PLACES = {
    "01-void": {},
    "02-orbit": {
        "N": {"x": 210, "y": 64, "w": 300},
        "A": {"x": 8, "y": 700, "w": 390, "bob": 4},
        "O": {"x": 368, "y": 735, "w": 330, "bob": 3},
    },
    "03-field": {
        "A": {"x": 4, "y": 690, "w": 400, "bob": 5},
        "O": {"x": 372, "y": 715, "w": 332, "bob": 4},
    },
    "04-forest": {
        "A": {"x": 70, "y": 455, "w": 310, "bob": 3},
        "O": {"x": 355, "y": 478, "w": 268, "bob": 3},
    },
    "05-hall": {
        "A": {"x": 16, "y": 615, "w": 385, "bob": 3},
        "O": {"x": 372, "y": 638, "w": 318, "bob": 3},
    },
    "06-raid": {
        "A": {"x": 20, "y": 630, "w": 400, "bob": 3},
        "O": {"x": 378, "y": 668, "w": 310, "bob": 3},
    },
    "07-climb": {
        "A": {"x": 24, "y": 635, "w": 380, "bob": 4},
        "O": {"x": 368, "y": 655, "w": 318, "bob": 3},
    },
    "08-invite": {
        "A": {"x": 10, "y": 545, "w": 360, "bob": 4},
        "O": {"x": 358, "y": 568, "w": 305, "bob": 3},
    },
}

STILL_NAME = {
    "01-void": "void.jpg",
    "02-orbit": "emblem.jpg",
    "03-field": "field.jpg",
    "04-forest": "forest.jpg",
    "05-hall": "hall.jpg",
    "06-raid": "raid.jpg",
    "07-climb": "climb.jpg",
    "08-invite": "invite.jpg",
}


def load_rgba(path: Path) -> Image.Image:
    return Image.open(path).convert("RGBA")


def scaled(im: Image.Image, w: int) -> Image.Image:
    h = max(1, round(im.height * (w / im.width)))
    return im.resize((w, h), Image.Resampling.NEAREST)


def ken(world: Image.Image, t: float, focus_y: float = 0.5) -> Image.Image:
    """Slow push-in. t in 0..1."""
    z = 1.0 + 0.075 * t
    sw, sh = int(W * z), int(H * z)
    big = world.resize((sw, sh), Image.Resampling.LANCZOS)
    x0 = (sw - W) // 2
    y0 = int((sh - H) * focus_y)
    y0 = max(0, min(sh - H, y0))
    return big.crop((x0, y0, x0 + W, y0 + H))


def paste(dst: Image.Image, spr: Image.Image, x: int, y: int) -> None:
    dst.alpha_composite(spr, (int(x), int(y)))


def shadow(dst: Image.Image, box: tuple[int, int, int, int], strength: int = 90) -> None:
    x, y, w, h = box
    layer = Image.new("RGBA", dst.size, (0, 0, 0, 0))
    sh = Image.new("RGBA", (max(8, w), max(6, h)), (0, 0, 0, strength))
    sh = sh.filter(ImageFilter.GaussianBlur(radius=max(4, w // 10)))
    layer.paste(sh, (x, y), sh)
    dst.alpha_composite(layer)


def glow_n(n: Image.Image) -> Image.Image:
    """Soft ember halo — does not recolor the letter pixels."""
    pad = 18
    canvas = Image.new("RGBA", (n.width + pad * 2, n.height + pad * 2), (0, 0, 0, 0))
    halo = n.split()[-1].filter(ImageFilter.GaussianBlur(radius=10))
    big_a = Image.new("L", canvas.size, 0)
    big_a.paste(halo, (pad, pad))
    big_a = big_a.point(lambda v: min(255, int(v * 0.55)))
    ember = Image.new("RGBA", canvas.size, (255, 106, 0, 0))
    ember.putalpha(big_a)
    canvas.alpha_composite(ember)
    canvas.paste(n, (pad, pad), n)
    return canvas


def compose_frame(
    clip: str,
    t: float,
    world: Image.Image,
    A: Image.Image,
    O: Image.Image,
    N: Image.Image,
) -> Image.Image:
    focus = 0.42 if clip == "01-void" else 0.55 if clip in ("04-forest", "08-invite") else 0.5
    bg = ken(world, t, focus).convert("RGBA")
    places = PLACES[clip]
    if "N" in places:
        spec = places["N"]
        nn = scaled(N, spec["w"])
        paste(bg, nn, spec["x"], spec["y"])
    elif clip == "01-void":
        nn = scaled(N, 440)
        paste(bg, nn, (W - nn.width) // 2, 268)
    for key, spr in (("A", A), ("O", O)):
        if key not in places:
            continue
        spec = places[key]
        im = scaled(spr, spec["w"])
        bob = spec.get("bob", 0) * math.sin(t * math.pi * 2)
        x, y = spec["x"], int(spec["y"] + bob)
        # contact shadow near the feet
        shadow(
            bg,
            (x + im.width // 6, y + im.height - 14, int(im.width * 0.62), 18),
            70,
        )
        paste(bg, im, x, y)
    return bg.convert("RGB")


def encode_clip(clip: str, frames_dir: Path, dest: Path) -> None:
    dest.parent.mkdir(parents=True, exist_ok=True)
    subprocess.run(
        [
            FF,
            "-y",
            "-framerate",
            str(FPS),
            "-i",
            str(frames_dir / "f%04d.jpg"),
            "-c:v",
            "libx264",
            "-preset",
            "veryfast",
            "-crf",
            "18",
            "-g",
            "1",
            "-keyint_min",
            "1",
            "-bf",
            "0",
            "-pix_fmt",
            "yuv420p",
            "-movflags",
            "+faststart",
            "-an",
            str(dest),
        ],
        check=True,
        capture_output=True,
    )


def main() -> None:
    preview = "--preview" in sys.argv
    only = [a for a in sys.argv[1:] if not a.startswith("--")]
    clips = only or list(WORLDS)

    A = load_rgba(FOUND / "reggina-live.png")
    O = load_rgba(FOUND / "reggino-live.png")
    N = glow_n(load_rgba(N_PATH))

    for path in WORLDS.values():
        if not path.exists():
            raise SystemExit(f"missing world {path}")

    PREVIEW.mkdir(parents=True, exist_ok=True)
    OUT.mkdir(parents=True, exist_ok=True)
    STILL.mkdir(parents=True, exist_ok=True)

    for clip in clips:
        world = Image.open(WORLDS[clip]).convert("RGB")
        world = world.resize((W, H), Image.Resampling.LANCZOS)
        print(f"== {clip} {'preview' if preview else 'encode'} ==", flush=True)
        mid = compose_frame(clip, 0.35, world, A, O, N)
        mid.save(PREVIEW / f"{clip}.jpg", quality=92)
        mid.save(OUT / f"{clip}.jpg", quality=90)
        still_name = STILL_NAME[clip]
        mid.save(STILL / still_name, quality=90)
        if preview:
            continue
        fdir = PREP / clip
        fdir.mkdir(parents=True, exist_ok=True)
        for i in range(FRAMES):
            t = i / max(1, FRAMES - 1)
            frame = compose_frame(clip, t, world, A, O, N)
            frame.save(fdir / f"f{i:04d}.jpg", quality=88)
        encode_clip(clip, fdir, OUT / f"{clip}.mp4")
        print(f"   wrote {clip}.mp4", flush=True)

    print("done")


if __name__ == "__main__":
    main()
