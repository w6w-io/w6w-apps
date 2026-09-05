import { assertEquals } from "@std/assert";
import subtaskCreate from "../../actions/subtask-create.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("subtask-create: POST /tasks/:task_id/subtasks", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: 99, name: "Subtask" } }]);
  const out = await subtaskCreate.execute({ taskId: 15, name: "Subtask" }, ctx);
  assertEquals(pathOf(calls[0].url), "/api/tasks/15/subtasks");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), { name: "Subtask" });
  assertEquals(out, { id: 99, name: "Subtask" });
});
