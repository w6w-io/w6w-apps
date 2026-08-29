import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/worker-delete.ts";

Deno.test("worker-delete: sends DELETE and reports success", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: undefined }]);
  const result = await action.execute!({ workerId: "w1" }, ctx);
  assertEquals(calls[0].url, "https://onfleet.com/api/v2/workers/w1");
  assertEquals(calls[0].method, "DELETE");
  assertEquals(result, { deleted: true });
});

Deno.test("worker-delete: workerId is required", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(async () => await action.execute!({}, ctx), Error, "workerId");
  assertEquals(calls.length, 0);
});
