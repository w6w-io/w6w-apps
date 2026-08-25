import { assertEquals } from "@std/assert";
import taskDelete from "../../actions/task-delete.ts";
import { mockCtx, pathOf, successBody } from "../_helpers.ts";

Deno.test("task-delete: DELETEs the task", async () => {
  const { ctx, calls } = mockCtx([{ body: successBody() }]);
  const out = await taskDelete.execute({ taskKey: "task1" }, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/api/v1/tasks/task1");
  assertEquals(out, { success: true });
});
