import { assertEquals } from "@std/assert";
import leadTaskDelete from "../../actions/lead-task-delete.ts";
import { asMutation, mockCtx, pathOf, writeResult } from "../_helpers.ts";

Deno.test("lead-task-delete: metadata — idempotent", () => {
  assertEquals(leadTaskDelete.type, "perform");
  assertEquals(leadTaskDelete.idempotent, true);
});

Deno.test("lead-task-delete: DELETE /leads/{leadId}/tasks with taskId in the BODY", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: writeResult("Successfully deleted", "task-1"),
  }]);
  const result = asMutation(
    await leadTaskDelete.execute({ leadId: "l1", taskId: "task-1" }, ctx),
  );
  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/api/crm/v1/leads/l1/tasks");
  assertEquals(JSON.parse(calls[0].body!), { taskId: "task-1" });
  assertEquals(result.info, "Successfully deleted");
});
