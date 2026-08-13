/**
 * HARD RULE — do not regress this architecture:
 *
 * Scroll-scrub drives a REAL video timeline (`HTMLVideoElement.currentTime`).
 * Never map scroll to a sparse still sequence (< 20fps). That reads as a
 * flipbook, not a film.
 *
 * Every scrub clip MUST be all-intra H.264 (GOP=1, no B-frames) so iOS and
 * desktop can seek frame-accurately. Encode via scripts/encode-scrub-film.sh.
 * Floor: 24fps. We never call play() — only seek — so iOS won't block.
 */

export type ClipId =
  | "void"
  | "orbit"
  | "field"
  | "forest"
  | "hall"
  | "raid"
  | "climb"
  | "invite";

export type Clip = {
  id: ClipId;
  src: string;
  poster: string;
  duration: number;
  weight: number;
  focusX: number;
  focusY: number;
  still: string;
  act: 1 | 2 | 3 | 4 | 5;
};

export const CLIPS: Clip[] = [
  {
    id: "void",
    src: "/film/video/01-void.mp4?v=slam1",
    poster: "/film/video/01-void.jpg?v=slam1",
    duration: 10.04,
    weight: 1.65,
    focusX: 0.5,
    focusY: 0.46,
    still: "/film/stills/void.jpg",
    act: 1,
  },
  {
    id: "orbit",
    src: "/film/video/02-orbit.mp4?v=arms1",
    poster: "/film/video/02-orbit.jpg",
    duration: 6.04,
    weight: 1.2,
    focusX: 0.5,
    focusY: 0.48,
    still: "/film/stills/emblem.jpg",
    act: 1,
  },
  {
    id: "field",
    src: "/film/video/03-field.mp4?v=arms1",
    poster: "/film/video/03-field.jpg",
    duration: 6.04,
    weight: 1.05,
    focusX: 0.5,
    focusY: 0.56,
    still: "/film/stills/field.jpg",
    act: 2,
  },
  {
    id: "forest",
    src: "/film/video/04-forest.mp4?v=arms1",
    poster: "/film/video/04-forest.jpg",
    duration: 6.04,
    weight: 1,
    focusX: 0.48,
    focusY: 0.5,
    still: "/film/stills/forest.jpg",
    act: 2,
  },
  {
    id: "hall",
    src: "/film/video/05-hall.mp4?v=arms1",
    poster: "/film/video/05-hall.jpg",
    duration: 6.04,
    weight: 1,
    focusX: 0.5,
    focusY: 0.48,
    still: "/film/stills/hall.jpg",
    act: 3,
  },
  {
    id: "raid",
    src: "/film/video/06-raid.mp4?v=arms3",
    poster: "/film/video/06-raid.jpg?v=arms3",
    duration: 6.04,
    weight: 1.05,
    focusX: 0.52,
    focusY: 0.46,
    still: "/film/stills/raid.jpg",
    act: 3,
  },
  {
    id: "climb",
    src: "/film/video/07-climb.mp4?v=arms3",
    poster: "/film/video/07-climb.jpg?v=arms3",
    duration: 6.04,
    weight: 1.2,
    focusX: 0.5,
    focusY: 0.4,
    still: "/film/stills/climb.jpg",
    act: 4,
  },
  {
    id: "invite",
    src: "/film/video/08-invite.mp4?v=arms1",
    poster: "/film/video/08-invite.jpg",
    duration: 6.04,
    weight: 1.15,
    focusX: 0.5,
    focusY: 0.5,
    still: "/film/stills/invite.jpg",
    act: 5,
  },
];

const totalWeight = CLIPS.reduce((s, c) => s + c.weight, 0);

export type ClipWindow = Clip & { start: number; end: number };

export const WINDOWS: ClipWindow[] = (() => {
  let cursor = 0;
  return CLIPS.map((clip) => {
    const start = cursor;
    const end = cursor + clip.weight / totalWeight;
    cursor = end;
    return { ...clip, start, end };
  });
})();

export function sampleFilm(progress: number): {
  clip: ClipWindow;
  next: ClipWindow | null;
  local: number;
  time: number;
} {
  const p = clamp01(progress);
  const clip =
    WINDOWS.find((w) => p < w.end) ?? WINDOWS[WINDOWS.length - 1]!;
  const idx = WINDOWS.indexOf(clip);
  const next = WINDOWS[idx + 1] ?? null;
  const span = Math.max(0.0001, clip.end - clip.start);
  const local = clamp01((p - clip.start) / span);
  const time = local * Math.max(0.04, clip.duration - 0.05);
  return { clip, next, local, time };
}

export type Cue = {
  id: string;
  start: number;
  peakIn: number;
  peakOut: number;
  end: number;
  kickerZh: string;
  kickerEn: string;
  zh: string;
  en: string;
  align: "left" | "center" | "right";
};

export const CUES: Cue[] = [
  {
    id: "name",
    start: 0.018,
    peakIn: 0.045,
    peakOut: 0.118,
    end: 0.155,
    kickerZh: "楓之谷：閒置英雄",
    kickerEn: "MapleStory Idle",
    zh: "No.1",
    en: "NumbahWan",
    align: "center",
  },
  {
    id: "world",
    start: 0.27,
    peakIn: 0.3,
    peakOut: 0.365,
    end: 0.4,
    kickerZh: "弓箭手村",
    kickerEn: "Henesys",
    zh: "每天都在打",
    en: "Daily. No days off.",
    align: "left",
  },
  {
    id: "house",
    start: 0.515,
    peakIn: 0.545,
    peakOut: 0.605,
    end: 0.64,
    kickerZh: "會長 RegginA · 副書記 RegginO",
    kickerEn: "Master RegginA · Vice RegginO",
    zh: "自由加入",
    en: "24 / 30",
    align: "left",
  },
  {
    id: "climb",
    start: 0.755,
    peakIn: 0.785,
    peakOut: 0.85,
    end: 0.882,
    kickerZh: "殘暴炎魔",
    kickerEn: "Zakum",
    zh: "先打到 No.1",
    en: "Rank 33. For now.",
    align: "center",
  },
  {
    id: "invite",
    start: 0.895,
    peakIn: 0.918,
    peakOut: 0.955,
    end: 0.978,
    kickerZh: "12月24日",
    kickerEn: "Dec 24",
    zh: "想來就來",
    en: "Come sit.",
    align: "center",
  },
];

export function cueOpacity(cue: Cue, p: number): number {
  if (p <= cue.start || p >= cue.end) return 0;
  if (p < cue.peakIn) return easeOut((p - cue.start) / (cue.peakIn - cue.start));
  if (p > cue.peakOut)
    return 1 - easeIn((p - cue.peakOut) / (cue.end - cue.peakOut));
  return 1;
}

export const ACTS = [
  { id: 1, zh: "名稱", en: "Name", start: 0, end: WINDOWS[1]!.end },
  { id: 2, zh: "日常", en: "Daily", start: WINDOWS[2]!.start, end: WINDOWS[3]!.end },
  { id: 3, zh: "公會", en: "Guild", start: WINDOWS[4]!.start, end: WINDOWS[5]!.end },
  { id: 4, zh: "排名", en: "Rank", start: WINDOWS[6]!.start, end: WINDOWS[6]!.end },
  { id: 5, zh: "加入", en: "Join", start: WINDOWS[7]!.start, end: 1 },
] as const;

export function activeAct(p: number): number {
  const a = ACTS.find((x) => p < x.end);
  return a?.id ?? 5;
}

export function clamp01(n: number): number {
  if (n < 0) return 0;
  if (n > 1) return 1;
  return n;
}

export function easeOut(t: number): number {
  const x = clamp01(t);
  return 1 - (1 - x) * (1 - x);
}

export function easeIn(t: number): number {
  const x = clamp01(t);
  return x * x;
}

export const FILM_VH = 1560;
export const POSTER = "/film/stills/void.jpg";
export const EMBLEM_STILL = "/brand/emblem.jpg";
export const SCRUB_FPS = 24;
