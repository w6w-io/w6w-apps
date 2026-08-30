import { assertEquals } from "@std/assert";
import taskReopen from "../../actions/task-reopen.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("task-reopen: POSTs /v1/tasks/{taskId}/reopen", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { data: { taskId: "TK1", revision: "3" } },
  }]);
  await taskReopen.execute({ taskId: "TK1" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v1/tasks/TK1/reopen");
});

Deno.test("task-reopen: is an idempotent perform action", () => {
  assertEquals(taskReopen.type, "perform");
  assertEquals(taskReopen.idempotent, true);
});
