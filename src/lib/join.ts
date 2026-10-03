import { createServerFn } from "@tanstack/react-start";
import { getSql } from "@/lib/db";
import { parseJoinInput, type JoinInput } from "@/lib/join-schema";

/**
 * Server function: persist a guild join request.
 *
 * Input is validated server-side by `parseJoinInput` (never trust the client),
 * and written with a tagged-template query so values are always parameterised.
 */
export const submitJoin = createServerFn({ method: "POST" })
  .validator((input: JoinInput) => parseJoinInput(input))
  .handler(async ({ data }) => {
    const sql = await getSql();
    const id = crypto.randomUUID();
    await sql`
      insert into join_requests (id, ign, class, note)
      values (${id}, ${data.ign}, ${data.cls}, ${data.note})
    `;
    return { ok: true as const };
  });
