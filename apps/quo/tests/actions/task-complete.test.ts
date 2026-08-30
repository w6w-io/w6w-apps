import { assertEquals } from "@std/assert";
import taskComplete from "../../actions/task-complete.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("task-complete: POSTs /v1/tasks/{taskId}/complete", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { data: { taskId: "TK1", revision: "2" } },
  }]);
  await taskComplete.execute({ taskId: "TK1" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v1/tasks/TK1/complete");
});

Deno.test("task-complete: is an idempotent perform action", () => {
  assertEquals(taskComplete.type, "perform");
  assertEquals(taskComplete.idempotent, true);
});
