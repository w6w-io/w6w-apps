import { assertEquals } from "@std/assert";
import taskChangeDueDate from "../../actions/task-change-due-date.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("task-change-due-date: POSTs /v1/tasks/{taskId}/change-due-date with dueDate", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { data: { taskId: "TK1", revision: "2" } },
  }]);
  await taskChangeDueDate.execute({ taskId: "TK1", dueDate: "2026-09-01T00:00:00Z" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v1/tasks/TK1/change-due-date");
  assertEquals(JSON.parse(calls[0].body!), { dueDate: "2026-09-01T00:00:00Z" });
});

Deno.test("task-change-due-date: is an idempotent perform action", () => {
  assertEquals(taskChangeDueDate.type, "perform");
  assertEquals(taskChangeDueDate.idempotent, true);
});
