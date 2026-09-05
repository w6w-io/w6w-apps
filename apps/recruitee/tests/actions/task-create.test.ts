import { assertEquals } from "@std/assert";
import taskCreate from "../../actions/task-create.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("task-create: nests fields under `task`, joins admin ids", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { task: { id: 1 }, references: [] } }]);
  await taskCreate.execute({
    title: "Rate candidate",
    description: "Review and rate skills",
    candidateId: 5,
    dueDate: "2026-09-10T00:00:00Z",
    timezone: "Europe/London",
    adminIds: [10, 11],
  }, ctx);

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/c/123/tasks");
  assertEquals(JSON.parse(calls[0].body!), {
    task: {
      title: "Rate candidate",
      description: "Review and rate skills",
      candidate_id: 5,
      due_date: "2026-09-10T00:00:00Z",
      timezone: "Europe/London",
      admin_ids: [10, 11],
    },
  });
});
