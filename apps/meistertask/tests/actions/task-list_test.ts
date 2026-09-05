import { assertEquals } from "@std/assert";
import taskList from "../../actions/task-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("task-list: GET /projects/:project_id/tasks with filters", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: [{ id: 15, name: "Task Name" }] }]);
  const out = await taskList.execute(
    { projectId: 15, assignedToMe: true, status: "open" },
    ctx,
  );
  assertEquals(pathOf(calls[0].url), "/api/projects/15/tasks");
  assertEquals(queryOf(calls[0].url), { assigned_to_me: "true", status: "open" });
  assertEquals(out, [{ id: 15, name: "Task Name" }]);
});
