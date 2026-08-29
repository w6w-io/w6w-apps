import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/task-delete.ts";

Deno.test("task-delete: sends DELETE and reports success", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: undefined }]);
  const result = await action.execute!({ taskId: "task_1" }, ctx);
  assertEquals(calls[0].url, "https://onfleet.com/api/v2/tasks/task_1");
  assertEquals(calls[0].method, "DELETE");
  assertEquals(result, { deleted: true });
});

Deno.test("task-delete: taskId is required", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(async () => await action.execute!({}, ctx), Error, "taskId");
  assertEquals(calls.length, 0);
});

Deno.test("task-delete: is idempotent", () => {
  assertEquals(action.idempotent, true);
});
