import { assert, assertEquals, assertRejects } from "@std/assert";
import downtimeList from "../../actions/downtime-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("downtime-list: calls GET /api/v2/downtime with offset paging", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [{ id: "d1" }], meta: {} } }]);
  const out = await downtimeList.execute({ limit: 30, offset: 60 }, ctx) as { data: unknown[] };

  assertEquals(pathOf(calls[0].url), "/api/v2/downtime");
  assertEquals(queryOf(calls[0].url), { "page[limit]": "30", "page[offset]": "60" });
  assertEquals(out.data, [{ id: "d1" }]);
});

Deno.test("downtime-list: current_only is sent only when asked for", async () => {
  const on = mockCtx([{ body: {} }]);
  await downtimeList.execute({ currentOnly: true }, on.ctx);
  assertEquals(queryOf(on.calls[0].url).current_only, "true");

  const off = mockCtx([{ body: {} }]);
  await downtimeList.execute({ currentOnly: false }, off.ctx);
  assertEquals("current_only" in queryOf(off.calls[0].url), false);
});

/**
 * The v2 downtime resources answer JSON:API-shaped errors — objects, not the
 * strings v1 returns. This is the end-to-end proof that the client reads them
 * rather than printing `[object Object]`.
 */
Deno.test("downtime-list: a JSON:API error is rendered readably", async () => {
  const { ctx } = mockCtx([{
    status: 403,
    body: {
      errors: [{ status: "403", title: "Forbidden", detail: "monitors_downtime is required" }],
    },
  }]);
  const err = await assertRejects(
    () => Promise.resolve(downtimeList.execute({}, ctx)),
    Error,
  );
  assert(err.message.includes("Forbidden: monitors_downtime is required"), err.message);
  assert(!err.message.includes("[object Object]"), err.message);
});

Deno.test("downtime-list: the current-only hint explains the two-day retention", () => {
  const hint = downtimeList.params?.find((p) => p.key === "currentOnly")?.hint ?? "";
  assert(hint.includes("two days"), hint);
});
