#!/usr/bin/env python3
"""Original NumbahWan house theme.

G Mixolydian. I–♭VII–IV–I. 92 BPM. Music-box + pad + pizz bass.
Not Floral Life. Not Above the Treetops. Our song.
"""
from __future__ import annotations

import math
import struct
import subprocess
import wave
from pathlib import Path

RATE = 44100
BPM = 92
BEAT = 60.0 / BPM
BARS = 16
BEATS_PER_BAR = 4
DUR = BARS * BEATS_PER_BAR * BEAT
OUT_WAV = Path("/tmp/house-theme.wav")
OUT_M4A = Path("/workspace/public/film/audio/house-theme.m4a")

# G Mixolydian
G, A, B, C, D, E, F = 196.00, 220.00, 246.94, 261.63, 293.66, 329.63, 349.23
G5, A5, B5, C6, D6, E6, F6 = 392.00, 440.00, 493.88, 523.25, 587.33, 659.25, 698.46

# Original motif — walks UP, Floral Life walks down. Different bones.
# bar:  G  B  D  E | F  E  D  C | G  A  B  D | C  B  A  G
MELODY = [
    (G5, 1), (B5, 1), (D6, 1), (E6, 1),
    (F6, 1), (E6, 1), (D6, 1), (C6, 1),
    (G5, 1), (A5, 1), (B5, 1), (D6, 1),
    (C6, 0.5), (B5, 0.5), (A5, 1), (G5, 2),
]
# second 8 bars: a little higher, then home
MELODY += [
    (B5, 1), (D6, 1), (E6, 1), (G5 * 2, 1),
    (F6, 1), (D6, 1), (C6, 1), (A5, 1),
    (G5, 1), (B5, 1), (D6, 0.5), (E6, 0.5), (D6, 1),
    (C6, 1), (B5, 1), (A5, 1), (G5, 1),
]

# bass: G G F F C C G G  (two bars each)
BASS_DEG = [G, G, F / 2, F / 2, C / 2, C / 2, G, G]
# pad chords per 2 bars: G, F, C, G
PADS = [
    (G, B, D),
    (F, A, C),
    (C, E, G),
    (G, B, D),
]


def env(i: int, n: int, a=0.02, r=0.12) -> float:
    t = i / n
    if t < a:
        return t / a
    if t > 1 - r:
        return max(0.0, (1 - t) / r)
    return 1.0


def sine(freq: float, n: int, vol: float, phase: float = 0.0) -> list[float]:
    out = []
    for i in range(n):
        e = env(i, n)
        out.append(math.sin(phase + 2 * math.pi * freq * i / RATE) * vol * e)
    return out


def tri(freq: float, n: int, vol: float) -> list[float]:
    out = []
    for i in range(n):
        e = env(i, n, 0.01, 0.18)
        x = (freq * i / RATE) % 1.0
        s = 4 * abs(x - 0.5) - 1
        out.append(s * vol * e)
    return out


def mix_at(buf: list[float], start: int, add: list[float]) -> None:
    for i, v in enumerate(add):
        j = start + i
        if 0 <= j < len(buf):
            buf[j] += v


def render() -> list[float]:
    n = int(DUR * RATE)
    buf = [0.0] * n
    # pad — held 4 bars each of the 4 chords, twice through 16 bars
    pad_len = int(4 * BEATS_PER_BAR * BEAT * RATE)
    for k, chord in enumerate(PADS * 2):
        start = k * pad_len
        for f in chord:
            mix_at(buf, start, sine(f, pad_len, 0.045))
            mix_at(buf, start, sine(f * 2.003, pad_len, 0.02))
    # pizz bass — quarter notes
    beat_n = int(BEAT * RATE)
    for bi in range(BARS * BEATS_PER_BAR):
        deg = BASS_DEG[(bi // 8) % len(BASS_DEG)]
        mix_at(buf, bi * beat_n, sine(deg, int(beat_n * 0.7), 0.11))
    # music-box melody
    t = 0.0
    for freq, beats in MELODY:
        start = int(t * BEAT * RATE)
        length = int(beats * BEAT * RATE)
        mix_at(buf, start, tri(freq, length, 0.16))
        mix_at(buf, start, sine(freq * 2, length, 0.05))
        t += beats
    # leaf shaker — soft noise on 2 and 4
    import random

    rng = random.Random(1)
    for bi in range(BARS * BEATS_PER_BAR):
        if bi % 2 == 1:
            start = bi * beat_n
            sh = int(0.06 * RATE)
            for i in range(sh):
                if start + i < n:
                    e = env(i, sh, 0.01, 0.5)
                    buf[start + i] += (rng.random() * 2 - 1) * 0.018 * e
    # fade ends so the loop is clean
    fade = int(0.08 * RATE)
    for i in range(fade):
        buf[i] *= i / fade
        buf[-1 - i] *= i / fade
    peak = max(abs(x) for x in buf) or 1.0
    return [max(-0.95, min(0.95, x / peak * 0.86)) for x in buf]


def main() -> None:
    samples = render()
    OUT_WAV.parent.mkdir(parents=True, exist_ok=True)
    OUT_M4A.parent.mkdir(parents=True, exist_ok=True)
    with wave.open(str(OUT_WAV), "w") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(RATE)
        w.writeframes(b"".join(struct.pack("<h", int(s * 32767)) for s in samples))
    subprocess.run(
        [
            "ffmpeg",
            "-y",
            "-i",
            str(OUT_WAV),
            "-c:a",
            "aac",
            "-b:a",
            "160k",
            str(OUT_M4A),
        ],
        check=True,
        capture_output=True,
    )
    print(f"wrote {OUT_M4A} ({OUT_M4A.stat().st_size} bytes) {DUR:.1f}s")


if __name__ == "__main__":
    main()
