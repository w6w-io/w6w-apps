import { assertEquals } from "@std/assert";
import chargeList from "../../actions/charge-list.ts";
import { listEnvelope, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("charge-list: hits GET /charges with the status and processed_at filters", async () => {
  const { ctx, calls } = mockCtx([{ body: listEnvelope("charges", [{ id: 1 }]) }]);
  const out = await chargeList.execute(
    { status: "queued,error", processedAtMin: "2026-01-01" },
    ctx,
  ) as { items: unknown[] };
  assertEquals(pathOf(calls[0].url), "/charges");
  assertEquals(queryOf(calls[0].url), { status: "queued,error", processed_at_min: "2026-01-01" });
  assertEquals(out.items, [{ id: 1 }]);
});

Deno.test("charge-list: sort_by is forwarded verbatim", async () => {
  const { ctx, calls } = mockCtx([{ body: listEnvelope("charges", []) }]);
  await chargeList.execute({ sortBy: "id-desc" }, ctx);
  assertEquals(queryOf(calls[0].url), { sort_by: "id-desc" });
});
