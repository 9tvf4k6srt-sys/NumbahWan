import { describe, expect, it } from "vitest";
import {
  ACTS,
  CLIPS,
  CUES,
  WINDOWS,
  activeAct,
  clamp01,
  cueOpacity,
  easeIn,
  easeOut,
  sampleFilm,
} from "@/lib/film";

describe("clamp01 / easing", () => {
  it("clamps to the unit interval", () => {
    expect(clamp01(-3)).toBe(0);
    expect(clamp01(0.42)).toBe(0.42);
    expect(clamp01(9)).toBe(1);
  });

  it("easing curves hit their endpoints and stay monotonic", () => {
    for (const ease of [easeIn, easeOut]) {
      expect(ease(0)).toBe(0);
      expect(ease(1)).toBe(1);
      let prev = -Infinity;
      for (let t = 0; t <= 1; t += 0.05) {
        const v = ease(t);
        expect(v).toBeGreaterThanOrEqual(prev);
        prev = v;
      }
    }
    // easeOut front-loads motion, easeIn back-loads it.
    expect(easeOut(0.5)).toBeGreaterThan(0.5);
    expect(easeIn(0.5)).toBeLessThan(0.5);
  });
});

describe("WINDOWS (scroll → clip timeline)", () => {
  it("has one window per clip, in order", () => {
    expect(WINDOWS.map((w) => w.id)).toEqual(CLIPS.map((c) => c.id));
  });

  it("tiles [0, 1] contiguously with no gaps or overlaps", () => {
    expect(WINDOWS[0]!.start).toBe(0);
    expect(WINDOWS.at(-1)!.end).toBeCloseTo(1, 10);
    for (let i = 1; i < WINDOWS.length; i++) {
      expect(WINDOWS[i]!.start).toBe(WINDOWS[i - 1]!.end);
    }
  });

  it("sizes each window proportionally to its clip weight", () => {
    const total = CLIPS.reduce((s, c) => s + c.weight, 0);
    for (const w of WINDOWS) {
      expect(w.end - w.start).toBeCloseTo(w.weight / total, 10);
    }
  });
});

describe("sampleFilm", () => {
  it("maps 0 to the very first frame of the first clip", () => {
    const s = sampleFilm(0);
    expect(s.clip.id).toBe(CLIPS[0]!.id);
    expect(s.local).toBe(0);
    expect(s.time).toBe(0);
    expect(s.next?.id).toBe(CLIPS[1]!.id);
  });

  it("maps 1 to the end of the last clip with no next clip", () => {
    const s = sampleFilm(1);
    expect(s.clip.id).toBe(CLIPS.at(-1)!.id);
    expect(s.next).toBeNull();
    expect(s.local).toBe(1);
  });

  it("clamps out-of-range progress instead of throwing", () => {
    expect(sampleFilm(-5).clip.id).toBe(CLIPS[0]!.id);
    expect(sampleFilm(5).clip.id).toBe(CLIPS.at(-1)!.id);
  });

  it("never seeks past the decodable end of a clip", () => {
    for (let p = 0; p <= 1; p += 0.001) {
      const { clip, time } = sampleFilm(p);
      expect(time).toBeGreaterThanOrEqual(0);
      expect(time).toBeLessThan(clip.duration);
    }
  });

  it("is monotonic: scrolling forward never moves the film backward", () => {
    const order = new Map(CLIPS.map((c, i) => [c.id, i]));
    let prev = { idx: 0, time: 0 };
    for (let p = 0; p <= 1; p += 0.0005) {
      const s = sampleFilm(p);
      const idx = order.get(s.clip.id)!;
      if (idx === prev.idx) expect(s.time).toBeGreaterThanOrEqual(prev.time);
      else expect(idx).toBe(prev.idx + 1); // never skips a clip
      prev = { idx, time: s.time };
    }
  });

  it("selects the clip whose window contains the progress", () => {
    for (const w of WINDOWS) {
      const mid = (w.start + w.end) / 2;
      expect(sampleFilm(mid).clip.id).toBe(w.id);
      expect(sampleFilm(mid).local).toBeCloseTo(0.5, 6);
    }
  });
});

describe("cueOpacity (subtitle fades)", () => {
  it("cue keyframes are strictly ordered and inside [0, 1]", () => {
    for (const c of CUES) {
      expect(0).toBeLessThanOrEqual(c.start);
      expect(c.start).toBeLessThan(c.peakIn);
      expect(c.peakIn).toBeLessThan(c.peakOut);
      expect(c.peakOut).toBeLessThan(c.end);
      expect(c.end).toBeLessThanOrEqual(1);
    }
  });

  it("cues never overlap, so only one line is on screen at a time", () => {
    for (let i = 1; i < CUES.length; i++) {
      expect(CUES[i]!.start).toBeGreaterThanOrEqual(CUES[i - 1]!.end);
    }
  });

  it("is 0 outside, 1 at plateau, and strictly between while fading", () => {
    const c = CUES[0]!;
    expect(cueOpacity(c, c.start)).toBe(0);
    expect(cueOpacity(c, c.end)).toBe(0);
    expect(cueOpacity(c, (c.peakIn + c.peakOut) / 2)).toBe(1);
    const fadeIn = cueOpacity(c, (c.start + c.peakIn) / 2);
    const fadeOut = cueOpacity(c, (c.peakOut + c.end) / 2);
    for (const v of [fadeIn, fadeOut]) {
      expect(v).toBeGreaterThan(0);
      expect(v).toBeLessThan(1);
    }
  });
});

describe("ACTS / activeAct (HUD chapter marker)", () => {
  it("acts are ordered and cover the whole film", () => {
    expect(ACTS[0].start).toBe(0);
    expect(ACTS.at(-1)!.end).toBe(1);
    for (let i = 1; i < ACTS.length; i++) {
      expect(ACTS[i]!.start).toBeCloseTo(ACTS[i - 1]!.end, 10);
    }
  });

  it("reports a non-decreasing act number as you scroll", () => {
    let prev = 1;
    for (let p = 0; p <= 1; p += 0.001) {
      const a = activeAct(p);
      expect(a).toBeGreaterThanOrEqual(prev);
      prev = a;
    }
    expect(activeAct(0)).toBe(1);
    expect(activeAct(1)).toBe(5);
  });
});
