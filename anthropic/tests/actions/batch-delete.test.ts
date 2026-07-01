import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/batch-delete.ts";

Deno.test("batch-delete: DELETEs /v1/messages/batches/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "batch_1", type: "message_batch_deleted" } }]);
  await action.execute!({ batchId: "batch_1" }, ctx);

  assertEquals(calls[0].method, "DELETE");
  assertEquals(new URL(calls[0].url).pathname, "/v1/messages/batches/batch_1");
  assertEquals(calls[0].headers["anthropic-version"], "2023-06-01");
});
