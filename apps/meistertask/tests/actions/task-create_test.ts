import { assertEquals } from "@std/assert";
import taskCreate from "../../actions/task-create.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("task-create: POST /sections/:section_id/tasks", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: 15, name: "Task Name" } }]);
  const out = await taskCreate.execute(
    { sectionId: 1, name: "Task Name", assignedToId: 9, labelIds: [1, 2] },
    ctx,
  );
  assertEquals(pathOf(calls[0].url), "/api/sections/1/tasks");
  assertEquals(calls[0].method, "POST");
  assertEquals(
    JSON.parse(calls[0].body!),
    { name: "Task Name", assigned_to_id: 9, label_ids: [1, 2] },
  );
  assertEquals(out, { id: 15, name: "Task Name" });
});
