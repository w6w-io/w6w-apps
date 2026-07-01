import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/batch-cancel.ts";

Deno.test("batch-cancel: POSTs /v1/messages/batches/{id}/cancel", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "batch_1", processing_status: "canceling" } }]);
  await action.execute!({ batchId: "batch_1" }, ctx);

  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/v1/messages/batches/batch_1/cancel");
  assertEquals(calls[0].headers["anthropic-version"], "2023-06-01");
});
