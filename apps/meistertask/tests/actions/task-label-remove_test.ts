import { assertEquals } from "@std/assert";
import taskLabelRemove from "../../actions/task-label-remove.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("task-label-remove: DELETE /task_labels/:id returns 204", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const out = await taskLabelRemove.execute({ id: 364 }, ctx);
  assertEquals(pathOf(calls[0].url), "/api/task_labels/364");
  assertEquals(calls[0].method, "DELETE");
  assertEquals(out, { deleted: true });
});
