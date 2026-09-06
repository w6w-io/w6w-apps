import { assertEquals } from "@std/assert";
import batchesList from "../../actions/batches-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("batches-list: calls GET /v1/batches with the limit query param", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ batch_id: "b1" }] }]);
  const out = await batchesList.execute({ limit: 5 }, ctx) as { batches: unknown[] };

  assertEquals(pathOf(calls[0].url), "/v1/batches");
  assertEquals(queryOf(calls[0].url), { limit: "5" });
  assertEquals(out.batches.length, 1);
});
