import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/batch-get.ts";

Deno.test("batch-get: GETs /v1/messages/batches/{id}", async () => {
  const body = { id: "batch_1", processing_status: "ended" };
  const { ctx, calls } = mockCtx([{ body }]);
  const result = await action.execute!({ batchId: "batch_1" }, ctx);

  assertEquals(calls[0].method, "GET");
  assertEquals(new URL(calls[0].url).pathname, "/v1/messages/batches/batch_1");
  assertEquals(calls[0].headers["anthropic-version"], "2023-06-01");
  assertEquals(result, body);
});
