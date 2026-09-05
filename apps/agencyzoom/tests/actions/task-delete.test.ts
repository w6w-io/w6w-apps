import { assertEquals } from "@std/assert";
import taskDelete from "../../actions/task-delete.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("task-delete: DELETEs /tasks/{taskId}", async () => {
  const { ctx, calls } = mockCtx([{ body: { message: "deleted" } }]);
  await taskDelete.execute({ taskId: 3 }, ctx);

  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/v1/api/tasks/3");
});

Deno.test("task-delete: is declared idempotent", () => {
  assertEquals(taskDelete.idempotent, true);
});
