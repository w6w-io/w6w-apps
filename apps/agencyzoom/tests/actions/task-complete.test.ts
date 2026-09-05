import { assertEquals } from "@std/assert";
import taskComplete from "../../actions/task-complete.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("task-complete: PUTs to /tasks/{taskId}/completed", async () => {
  const { ctx, calls } = mockCtx([{ body: { message: "ok" } }]);
  await taskComplete.execute({ taskId: 3 }, ctx);

  assertEquals(calls[0].method, "PUT");
  assertEquals(pathOf(calls[0].url), "/v1/api/tasks/3/completed");
});

Deno.test("task-complete: is declared idempotent", () => {
  assertEquals(taskComplete.idempotent, true);
});
