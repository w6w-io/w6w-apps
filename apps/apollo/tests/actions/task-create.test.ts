import { assertEquals } from "@std/assert";
import taskCreate from "../../actions/task-create.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("task-create: POSTs a JSON body to /tasks with all five required fields", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { task: { id: "t1", type: "call" } } }]);
  const out = await taskCreate.execute(
    {
      user_id: "u1",
      contact_id: "c1",
      type: "call",
      status: "scheduled",
      due_at: "2026-09-01T10:00:00Z",
    },
    ctx,
  ) as { task: { id: string } };

  assertEquals(pathOf(calls[0].url), "/api/v1/tasks");
  assertEquals(JSON.parse(calls[0].body!), {
    user_id: "u1",
    contact_id: "c1",
    type: "call",
    status: "scheduled",
    due_at: "2026-09-01T10:00:00Z",
  });
  assertEquals(out.task.id, "t1");
});
