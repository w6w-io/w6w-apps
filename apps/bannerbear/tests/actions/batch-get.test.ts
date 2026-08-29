import { assertEquals } from "@std/assert";
import batchGet from "../../actions/batch-get.ts";
import { assertRejects, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("batch-get: GET /batches/{uid}", async () => {
  const { ctx, calls } = mockCtx([{ body: { uid: "b1", status: "completed", total: 2 } }]);
  const out = await batchGet.execute({ uid: "b1" }, ctx) as unknown as Record<string, unknown>;

  assertEquals(pathOf(calls[0].url), "/batches/b1");
  assertEquals(out.status, "completed");
});

Deno.test("batch-get: requires uid", async () => {
  const { ctx } = mockCtx([]);
  await assertRejects(() => batchGet.execute({ uid: "" }, ctx));
});
