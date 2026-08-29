import { assertEquals } from "@std/assert";
import taskDelete from "../../actions/task-delete.ts";
import { mockWrikeCtx, pathOf } from "../_helpers.ts";

Deno.test("task-delete: DELETEs /tasks/{taskId} and returns the status", async () => {
  const { ctx, calls } = mockWrikeCtx([{ status: 200, body: {} }]);
  const out = await taskDelete.execute({ taskId: "T1" }, ctx) as { status: number };
  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/api/v4/tasks/T1");
  assertEquals(out.status, 200);
});

Deno.test("task-delete: is declared idempotent — a repeat delete 404s rather than double-acting", () => {
  assertEquals(taskDelete.idempotent, true);
});
