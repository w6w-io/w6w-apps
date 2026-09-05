import { assertEquals } from "@std/assert";
import subtaskList from "../../actions/subtask-list.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("subtask-list: GET /tasks/:task_id/subtasks", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: [{ id: 99, name: "Subtask" }] }]);
  const out = await subtaskList.execute({ taskId: 15 }, ctx);
  assertEquals(pathOf(calls[0].url), "/api/tasks/15/subtasks");
  assertEquals(out, [{ id: 99, name: "Subtask" }]);
});
