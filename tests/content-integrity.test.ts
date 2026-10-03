/**
 * Content integrity: every asset path referenced from code must exist on disk.
 * Catches the classic "renamed a file, shipped a broken image" regression
 * before it reaches production.
 */
import { existsSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { CLIPS } from "@/lib/film";
import { guild, roster } from "@/lib/guild";
import { memberCards } from "@/lib/members";

const PUBLIC = join(__dirname, "..", "public");
const onDisk = (url: string) => join(PUBLIC, url.split("?")[0]!);

describe("film assets", () => {
  it.each(CLIPS.map((c) => [c.id, c] as const))(
    "%s: video, poster and reduced-motion still exist",
    (_, clip) => {
      for (const url of [clip.src, clip.poster, clip.still]) {
        expect(existsSync(onDisk(url)), url).toBe(true);
      }
      expect(statSync(onDisk(clip.src)).size).toBeGreaterThan(0);
    },
  );

  it("clip ids are unique", () => {
    expect(new Set(CLIPS.map((c) => c.id)).size).toBe(CLIPS.length);
  });
});

describe("roster", () => {
  it("member slugs are unique", () => {
    expect(new Set(roster.map((m) => m.slug)).size).toBe(roster.length);
  });

  it("every member has a portrait, a card and a thumbnail on disk", () => {
    expect(memberCards).toHaveLength(roster.length);
    for (const m of memberCards) {
      for (const url of [m.img, m.art, m.thumb]) {
        expect(existsSync(onDisk(url)), `${m.slug}: ${url}`).toBe(true);
      }
    }
  });

  it("guild stats are internally consistent", () => {
    expect(guild.members).toBe(roster.length);
    expect(guild.members).toBeLessThanOrEqual(guild.capacity);
    expect(roster.some((m) => m.name === guild.master)).toBe(true);
  });
});
