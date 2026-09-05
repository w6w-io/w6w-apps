import { assertEquals } from "@std/assert";
import taskLabelList from "../../actions/task-label-list.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("task-label-list: GET /tasks/:task_id/task_labels — the join rows", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: [{ id: 364, label_id: 25, task_id: 123 }],
  }]);
  const out = await taskLabelList.execute({ taskId: 123 }, ctx);
  assertEquals(pathOf(calls[0].url), "/api/tasks/123/task_labels");
  assertEquals(out, [{ id: 364, label_id: 25, task_id: 123 }]);
});
