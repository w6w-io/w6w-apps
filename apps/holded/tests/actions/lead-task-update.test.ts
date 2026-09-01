import { assertEquals } from "@std/assert";
import leadTaskUpdate from "../../actions/lead-task-update.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("lead-task-update: metadata — idempotent", () => {
  assertEquals(leadTaskUpdate.type, "perform");
  assertEquals(leadTaskUpdate.idempotent, true);
});

Deno.test("lead-task-update: PUT /leads/{leadId}/tasks with taskId + name", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  const result = await leadTaskUpdate.execute({
    leadId: "l1",
    taskId: "task-1",
    name: "new task name",
  }, ctx);
  assertEquals(calls[0].method, "PUT");
  assertEquals(pathOf(calls[0].url), "/api/crm/v1/leads/l1/tasks");
  assertEquals(JSON.parse(calls[0].body!), { taskId: "task-1", name: "new task name" });
  // Holded's own spec documents this response as an empty object — the action
  // must not assume the usual {status, info, id} envelope.
  assertEquals(result, { result: {} });
});
