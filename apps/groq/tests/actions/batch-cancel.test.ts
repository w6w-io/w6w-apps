import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/batch-cancel.ts";

Deno.test("batch-cancel: POSTs to /openai/v1/batches/{id}/cancel", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "batch_1", status: "cancelling" } }]);
  const result = await action.execute!({ batchId: "batch_1" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/openai/v1/batches/batch_1/cancel");
  assertEquals(result, { id: "batch_1", status: "cancelling" });
});

Deno.test("batch-cancel: is marked idempotent", () => {
  assertEquals(action.idempotent, true);
});
