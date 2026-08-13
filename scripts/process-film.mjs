#!/usr/bin/env node
/**
 * Extract scroll-scrub frames from cinematic clips and stage brand stills.
 */
import { spawnSync } from "node:child_process";
import { mkdirSync, copyFileSync, writeFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const ROOT = "/workspace";
const VIDEOS = "/workspace/artifacts/imagine_videos";
const IMAGES = "/workspace/artifacts/imagine_images";
const OUT = "/workspace/public/film";

const clips = [
  { id: "void", file: "6e89b114-3a29-4886-a565-0818ecea108a.mp4" },
  { id: "field", file: "48bd6164-84cb-4a2a-b3ce-327807de6af8.mp4" },
  { id: "forest", file: "16c3e27f-a7dd-490e-8192-091cec0aeed8.mp4" },
  { id: "hall", file: "b1a4f8f5-98af-44e4-b0bf-86c58d2d4d6a.mp4" },
  { id: "raid", file: "785e6d2c-09f8-4e17-89d4-7cb2bbccab34.mp4" },
  { id: "climb", file: "ab6ff191-5212-4d49-a18a-bfde3ae71516.mp4" },
  { id: "invite", file: "b7fc4422-f085-40c0-bdff-94162db84ec8.mp4" },
];

const stills = {
  "stills/void.jpg": "7e0dd5e2-c199-4e7b-892d-643f089e507e.jpg",
  "stills/emblem.jpg": "b85085c1-a147-45ab-be94-f553fddf1e8a.jpg",
  "stills/field.jpg": "74a80d2b-d280-4833-a7b8-e948d10a1a78.jpg",
  "stills/forest.jpg": "aeeda930-43de-42cb-aed9-712056c2d8d6.jpg",
  "stills/hall.jpg": "bc5ff516-dedc-4d6c-9a05-35cf880db809.jpg",
  "stills/raid.jpg": "eca258fa-1681-4246-8edf-eb54c19b7c45.jpg",
  "stills/climb.jpg": "f00e77cb-a6a4-482c-a7ca-73bd2a863382.jpg",
  "stills/invite.jpg": "beabba19-2550-491a-81b6-19bd9d8acb4c.jpg",
  "stills/n-hero.jpg": "f4cceb54-deb4-40c7-bcea-54aa0dafd2f0.jpg",
};

const brand = {
  "/workspace/public/brand/emblem.jpg": "f4cceb54-deb4-40c7-bcea-54aa0dafd2f0.jpg",
  "/workspace/public/brand/members/gege.jpg": "fa9a62cc-5a94-44e8-b309-0b9ffeebbb03.jpg",
  "/workspace/public/brand/members/sun.jpg": "9ba6c3a3-b616-4c61-9556-7531a792381b.jpg",
  "/workspace/public/brand/members/reggina.jpg": "0b504c4d-6426-4090-a793-87679f0b6cbc.jpg",
  "/workspace/public/brand/leaf-raw.jpg": "754b3b82-f51a-46a1-915c-5b4d09b395dd.jpg",
};

mkdirSync(join(OUT, "stills"), { recursive: true });
mkdirSync("/workspace/public/brand/members", { recursive: true });

for (const [dest, src] of Object.entries(stills)) {
  copyFileSync(join(IMAGES, src), join(OUT, dest));
}
for (const [dest, src] of Object.entries(brand)) {
  copyFileSync(join(IMAGES, src), dest);
}

const manifest = [];

for (const clip of clips) {
  const dir = join(OUT, "clips", clip.id);
  mkdirSync(dir, { recursive: true });
  const input = join(VIDEOS, clip.file);
  const r = spawnSync(
    "ffmpeg",
    [
      "-y",
      "-i",
      input,
      "-vf",
      "fps=6,scale=960:-2:flags=lanczos",
      "-c:v",
      "libwebp",
      "-quality",
      "68",
      "-compression_level",
      "4",
      join(dir, "%03d.webp"),
    ],
    { encoding: "utf8" },
  );
  if (r.status !== 0) {
    console.error(r.stderr);
    throw new Error(`ffmpeg failed for ${clip.id}`);
  }
  const frames = readdirSync(dir)
    .filter((f) => f.endsWith(".webp"))
    .sort();
  console.log(clip.id, frames.length, "frames");
  manifest.push({ id: clip.id, frames: frames.length });
}

writeFileSync(join(OUT, "manifest.json"), JSON.stringify({ clips: manifest }, null, 2));
console.log("done");
