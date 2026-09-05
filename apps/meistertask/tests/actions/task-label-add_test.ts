import { assertEquals } from "@std/assert";
import taskLabelAdd from "../../actions/task-label-add.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("task-label-add: POST /tasks/:task_id/task_labels", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: 364, label_id: 25, task_id: 123 } }]);
  const out = await taskLabelAdd.execute({ taskId: 123, labelId: 25 }, ctx);
  assertEquals(pathOf(calls[0].url), "/api/tasks/123/task_labels");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), { label_id: 25 });
  assertEquals(out, { id: 364, label_id: 25, task_id: 123 });
});
