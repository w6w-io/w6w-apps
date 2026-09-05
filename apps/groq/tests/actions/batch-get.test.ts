import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/batch-get.ts";

Deno.test("batch-get: GETs /openai/v1/batches/{id}", async () => {
  const body = { id: "batch_1", status: "completed" };
  const { ctx, calls } = mockCtx([{ body }]);
  const result = await action.execute!({ batchId: "batch_1" }, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(new URL(calls[0].url).pathname, "/openai/v1/batches/batch_1");
  assertEquals(result, body);
});
