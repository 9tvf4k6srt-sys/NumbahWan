#!/usr/bin/env python3
"""Lock raid + climb so Zakum arms cannot vanish.

Raid: the slam deleted 4 of 6 arms. We Ken-Burns the first plate
      that still has all six — same pixels every frame.

Climb: she had 0 arms on her body. We Ken-Burns a locked plate
      where the 8-arm fan is already on her.

QA samples 5 timestamps. A mid-clip drop fails the gate.
"""
from __future__ import annotations

import shutil
import subprocess
from pathlib import Path

from PIL import Image

ROOT = Path("/workspace")
VIDEO = ROOT / "public" / "film" / "video"
STILL = ROOT / "public" / "film" / "stills"
STILL_A = ROOT / "public" / "film" / "stills-alive"
FOUND = ROOT / "public" / "brand" / "founders"
PREP = Path("/tmp/zakum-lock")
FF = "/usr/local/bin/ffmpeg"
W, H, FPS, N = 720, 1280, 24, 145  # 6.04s

PREP.mkdir(parents=True, exist_ok=True)

RAID_PLATE = Path("/workspace/screenshots/zakum-audit/06-raid_t0.2.jpg")
CLIMB_PLATE = Path(
    "/workspace/artifacts/imagine_images/9a26fb77-b5b3-44d0-9e9b-a94a8bce1b63.jpg"
)


def ff(*args: str) -> None:
    subprocess.check_call(
        [FF, "-y", *args],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )


def ken_burns(src: Path, dest_dir: Path, zoom_end: float = 1.08, dy: int = 22) -> None:
    dest_dir.mkdir(parents=True, exist_ok=True)
    for p in dest_dir.glob("f*.png"):
        p.unlink()
    im = Image.open(src).convert("RGB")
    # work on a padded canvas so the crop can travel
    pad_w, pad_h = int(W * 1.16), int(H * 1.16)
    canvas = im.resize((pad_w, pad_h), Image.Resampling.LANCZOS)
    for i in range(N):
        u = i / max(1, N - 1)
        z = 1.0 + (zoom_end - 1.0) * u
        cw, ch = max(W, int(round(W * z))), max(H, int(round(H * z)))
        # keep crop inside canvas
        cw = min(cw, pad_w)
        ch = min(ch, pad_h)
        x = (pad_w - cw) // 2
        y = max(0, min(pad_h - ch, (pad_h - ch) // 2 + int(dy * u)))
        crop = canvas.crop((x, y, x + cw, y + ch)).resize(
            (W, H), Image.Resampling.LANCZOS
        )
        crop.save(dest_dir / f"f{i + 1:04d}.png")


def encode_intra(frames: Path, dest: Path) -> None:
    raw = VIDEO / "_raw"
    raw.mkdir(exist_ok=True)
    if dest.exists() and not (raw / dest.name).exists():
        shutil.copy2(dest, raw / dest.name)
    stacked = PREP / f"{dest.stem}-kb.mp4"
    ff(
        "-framerate",
        str(FPS),
        "-i",
        str(frames / "f%04d.png"),
        "-c:v",
        "libx264",
        "-preset",
        "fast",
        "-crf",
        "17",
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
    ff("-ss", "0.2", "-i", str(dest), "-frames:v", "1", "-q:v", "3", str(dest.with_suffix(".jpg")))


def write_stills() -> None:
    pairs = {
        "06-raid": ("raid.jpg", "06-raid.jpg"),
        "07-climb": ("climb.jpg", "07-climb.jpg"),
    }
    for clip, (sname, aname) in pairs.items():
        poster = VIDEO / f"{clip}.jpg"
        if poster.exists():
            (STILL / sname).write_bytes(poster.read_bytes())
            (STILL_A / aname).write_bytes(poster.read_bytes())
    # persist the locked plates next to the brand
    if RAID_PLATE.exists():
        shutil.copy2(RAID_PLATE, FOUND / "zakum-raid-lock.jpg")
    if CLIMB_PLATE.exists():
        shutil.copy2(CLIMB_PLATE, FOUND / "zakum-climb-lock.jpg")


def main() -> None:
    assert RAID_PLATE.exists(), RAID_PLATE
    assert CLIMB_PLATE.exists(), CLIMB_PLATE
    print("ken-burns raid (6 arms locked)", flush=True)
    ken_burns(RAID_PLATE, PREP / "raid-kb", zoom_end=1.07, dy=28)
    encode_intra(PREP / "raid-kb", VIDEO / "06-raid.mp4")
    print("ken-burns climb (8-arm fan locked)", flush=True)
    ken_burns(CLIMB_PLATE, PREP / "climb-kb", zoom_end=1.06, dy=14)
    encode_intra(PREP / "climb-kb", VIDEO / "07-climb.mp4")
    write_stills()
    print("done")


if __name__ == "__main__":
    main()
