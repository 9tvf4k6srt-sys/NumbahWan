import { describe, expect, it } from "vitest";
import { JOIN_LIMITS, parseJoinInput } from "@/lib/join-schema";

describe("parseJoinInput", () => {
  it("trims and passes through valid input", () => {
    expect(parseJoinInput({ ign: "  RegginA ", cls: " Night Lord ", note: " hi " })).toEqual({
      ign: "RegginA",
      cls: "Night Lord",
      note: "hi",
    });
  });

  it("accepts CJK in-game names (2 characters is enough)", () => {
    expect(parseJoinInput({ ign: "冰風", cls: "", note: "" }).ign).toBe("冰風");
  });

  it.each([
    ["empty", ""],
    ["whitespace only", "    "],
    ["one character", "A"],
    ["one char padded", "  A  "],
  ])("rejects a too-short name (%s) with a bilingual error", (_, ign) => {
    expect(() => parseJoinInput({ ign, cls: "", note: "" })).toThrow(
      /至少 2 個字.*at least 2 characters/,
    );
  });

  it("clamps every field to its limit so the DB never gets unbounded text", () => {
    const out = parseJoinInput({
      ign: "x".repeat(500),
      cls: "y".repeat(500),
      note: "z".repeat(5000),
    });
    expect(out.ign).toHaveLength(JOIN_LIMITS.ignMax);
    expect(out.cls).toHaveLength(JOIN_LIMITS.clsMax);
    expect(out.note).toHaveLength(JOIN_LIMITS.noteMax);
  });

  it("coerces hostile / malformed payloads instead of crashing", () => {
    expect(() => parseJoinInput(null)).toThrow();
    expect(() => parseJoinInput(undefined)).toThrow();
    expect(parseJoinInput({ ign: 12345 } as unknown)).toEqual({
      ign: "12345",
      cls: "",
      note: "",
    });
  });

  it("does not strip or alter content (SQL is parameterised, not escaped)", () => {
    const ign = "Robert'); DROP TABLE join_requests;--";
    expect(parseJoinInput({ ign, cls: "", note: "" }).ign).toBe(ign.slice(0, 24));
  });
});
