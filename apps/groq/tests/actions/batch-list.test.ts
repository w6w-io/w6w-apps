import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/batch-list.ts";

Deno.test("batch-list: GETs /openai/v1/batches", async () => {
  const body = { object: "list", data: [{ id: "batch_1" }] };
  const { ctx, calls } = mockCtx([{ body }]);
  const result = await action.execute!({}, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(new URL(calls[0].url).pathname, "/openai/v1/batches");
  assertEquals(result, body);
});
