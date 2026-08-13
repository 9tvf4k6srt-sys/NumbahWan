import { createServerFn } from "@tanstack/react-start";
import { getSql } from "@/lib/db";
import { copy } from "@/lib/copy";

export const submitJoin = createServerFn({ method: "POST" })
  .validator((input: { ign: string; cls: string; note: string }) => {
    const ign = String(input.ign ?? "")
      .trim()
      .slice(0, 24);
    if (ign.length < 2) {
      throw new Error(`${copy.ignErrZh} ${copy.ignErrEn}`);
    }
    return {
      ign,
      cls: String(input.cls ?? "").trim().slice(0, 24),
      note: String(input.note ?? "").trim().slice(0, 280),
    };
  })
  .handler(async ({ data }) => {
    const sql = await getSql();
    const id = crypto.randomUUID();
    await sql`
      insert into join_requests (id, ign, class, note)
      values (${id}, ${data.ign}, ${data.cls}, ${data.note})
    `;
    return { ok: true as const };
  });
