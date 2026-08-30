import { assertEquals } from "@std/assert";
import taskRemoveDueDate from "../../actions/task-remove-due-date.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("task-remove-due-date: POSTs /v1/tasks/{taskId}/remove-due-date", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { data: { taskId: "TK1", revision: "3" } },
  }]);
  await taskRemoveDueDate.execute({ taskId: "TK1" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v1/tasks/TK1/remove-due-date");
});

Deno.test("task-remove-due-date: is an idempotent perform action", () => {
  assertEquals(taskRemoveDueDate.type, "perform");
  assertEquals(taskRemoveDueDate.idempotent, true);
});
