import { copy } from "@/lib/copy";

/** Field limits for a guild join request. Shared by client + server. */
export const JOIN_LIMITS = {
  ignMin: 2,
  ignMax: 24,
  clsMax: 24,
  noteMax: 280,
} as const;

export type JoinInput = { ign: string; cls: string; note: string };

/**
 * Normalise and validate untrusted join-form input.
 *
 * Pure and framework-free so it can be unit tested and reused on both sides of
 * the network boundary. Non-string values are coerced, whitespace is trimmed
 * and every field is clamped to its limit so the database never receives
 * unbounded text. Throws a bilingual error when the in-game name is too short.
 */
export function parseJoinInput(raw: unknown): JoinInput {
  const input = (raw ?? {}) as Partial<Record<keyof JoinInput, unknown>>;
  const clean = (v: unknown, max: number) =>
    String(v ?? "")
      .trim()
      .slice(0, max);

  const ign = clean(input.ign, JOIN_LIMITS.ignMax);
  if (ign.length < JOIN_LIMITS.ignMin) {
    throw new Error(`${copy.ignErrZh} ${copy.ignErrEn}`);
  }
  return {
    ign,
    cls: clean(input.cls, JOIN_LIMITS.clsMax),
    note: clean(input.note, JOIN_LIMITS.noteMax),
  };
}
