import { assertEquals } from "@std/assert";
import taskAssign from "../../actions/task-assign.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("task-assign: POSTs /v1/tasks/{taskId}/assign with userId", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { data: { taskId: "TK1", revision: "2" } },
  }]);
  await taskAssign.execute({ taskId: "TK1", userId: "US1" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v1/tasks/TK1/assign");
  assertEquals(JSON.parse(calls[0].body!), { userId: "US1" });
});

Deno.test("task-assign: is an idempotent perform action", () => {
  assertEquals(taskAssign.type, "perform");
  assertEquals(taskAssign.idempotent, true);
});
