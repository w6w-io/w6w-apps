import { assertEquals } from "@std/assert";
import taskDelete from "../../actions/task-delete.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("task-delete: DELETEs /v1/tasks/{taskId} and reports deleted:true on 204", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const out = await taskDelete.execute({ taskId: "TK1" }, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/v1/tasks/TK1");
  assertEquals(out, { deleted: true });
});

Deno.test("task-delete: is an idempotent perform action", () => {
  assertEquals(taskDelete.type, "perform");
  assertEquals(taskDelete.idempotent, true);
});
