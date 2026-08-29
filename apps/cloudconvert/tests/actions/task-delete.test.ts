import { assertEquals } from "@std/assert";
import taskDelete from "../../actions/task-delete.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("task-delete: DELETEs /v2/tasks/{id} and reports deleted on 204", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const out = await taskDelete.execute({ taskId: "t1" }, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/v2/tasks/t1");
  assertEquals(out, { deleted: true });
});

Deno.test("task-delete: is declared idempotent", () => {
  assertEquals(taskDelete.idempotent, true);
});
