#!/usr/bin/env python3
"""Encode one I2V (or a concat of two) to all-intra 9:16 for scroll-scrub.

Never Ken-Burns a still. That was the mistake.
"""
from __future__ import annotations

import shutil
import subprocess
import sys
from pathlib import Path

FF = "/usr/local/bin/ffmpeg"
VIDEO = Path("/workspace/public/film/video")
STILL = Path("/workspace/public/film/stills")
STILL_A = Path("/workspace/public/film/stills-alive")
ART = Path("/workspace/artifacts/imagine_videos")


def ff(*args: str) -> None:
    subprocess.check_call(
        [FF, "-y", *args],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )


def encode_intra(src: Path, dest: Path) -> None:
    raw = VIDEO / "_raw"
    raw.mkdir(exist_ok=True)
    if dest.exists() and not (raw / dest.name).exists():
        shutil.copy2(dest, raw / dest.name)
    ff(
        "-i",
        str(src),
        "-t",
        "6.04",
        "-vf",
        "fps=24,scale=720:1280:flags=lanczos,setsar=1",
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
    ff("-ss", "0.25", "-i", str(dest), "-frames:v", "1", "-q:v", "3", str(dest.with_suffix(".jpg")))


def concat_two(a: Path, ta: float, b: Path, tb: float, dest: Path) -> None:
    tmp = Path("/tmp/zakum-lock")
    tmp.mkdir(exist_ok=True)
    a_cut = tmp / "a-cut.mp4"
    b_cut = tmp / "b-cut.mp4"
    ff("-i", str(a), "-t", f"{ta:.2f}", "-c", "copy", str(a_cut))
    ff("-i", str(b), "-t", f"{tb:.2f}", "-c", "copy", str(b_cut))
    # re-encode to a common timebase then concat
    a_r = tmp / "a-r.mp4"
    b_r = tmp / "b-r.mp4"
    vf = "fps=24,scale=720:1280:flags=lanczos,setsar=1"
    for src, out in ((a_cut, a_r), (b_cut, b_r)):
        ff("-i", str(src), "-vf", vf, "-c:v", "libx264", "-preset", "veryfast", "-crf", "16", "-an", str(out))
    lst = tmp / "concat.txt"
    lst.write_text(f"file '{a_r}'\nfile '{b_r}'\n")
    stacked = tmp / "stacked.mp4"
    ff("-f", "concat", "-safe", "0", "-i", str(lst), "-c", "copy", str(stacked))
    encode_intra(stacked, dest)


def main() -> None:
    raid = ART / "b51c33bf-67ca-44e5-9d4c-df94ef74e28b.mp4"
    climb_a = ART / "9545a56f-5d5d-4045-a618-1136001ef247.mp4"
    climb_b = ART / "7a7101be-3b66-45be-8ddc-b1778bd8903f.mp4"
    assert raid.exists() and climb_a.exists() and climb_b.exists()

    print("raid I2V → 06-raid", flush=True)
    encode_intra(raid, VIDEO / "06-raid.mp4")

    print("climb two-beat concat → 07-climb", flush=True)
    concat_two(climb_a, 2.80, climb_b, 3.24, VIDEO / "07-climb.mp4")

    (STILL / "raid.jpg").write_bytes((VIDEO / "06-raid.jpg").read_bytes())
    (STILL / "climb.jpg").write_bytes((VIDEO / "07-climb.jpg").read_bytes())
    (STILL_A / "06-raid.jpg").write_bytes((VIDEO / "06-raid.jpg").read_bytes())
    (STILL_A / "07-climb.jpg").write_bytes((VIDEO / "07-climb.jpg").read_bytes())
    print("done")


if __name__ == "__main__":
    main()
