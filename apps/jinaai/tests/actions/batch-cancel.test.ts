import { assertEquals } from "@std/assert";
import batchCancel from "../../actions/batch-cancel.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("batch-cancel: calls DELETE /v1/batch/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { batch_id: "b1", status: "cancelled" } }]);
  const out = await batchCancel.execute({ batchId: "b1" }, ctx) as { status: string };

  assertEquals(pathOf(calls[0].url), "/v1/batch/b1");
  assertEquals(calls[0].method, "DELETE");
  assertEquals(out.status, "cancelled");
});
