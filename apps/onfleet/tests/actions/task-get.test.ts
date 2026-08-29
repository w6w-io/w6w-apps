import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/task-get.ts";

Deno.test("task-get: fetches by id", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "task_1", state: 3 } }]);
  const result = await action.execute!({ taskId: "task_1" }, ctx);
  assertEquals(calls[0].url, "https://onfleet.com/api/v2/tasks/task_1");
  assertEquals(calls[0].method, "GET");
  assertEquals((result as { state: number }).state, 3);
});

Deno.test("task-get: taskId is required", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(async () => await action.execute!({}, ctx), Error, "taskId");
  assertEquals(calls.length, 0);
});

Deno.test("task-get: is a read action requiring no idempotency flag", () => {
  assertEquals(action.type, "read");
});
