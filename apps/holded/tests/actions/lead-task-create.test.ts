import { assertEquals } from "@std/assert";
import leadTaskCreate from "../../actions/lead-task-create.ts";
import { asMutation, mockCtx, pathOf, writeResult } from "../_helpers.ts";

Deno.test("lead-task-create: metadata — not idempotent, appends", () => {
  assertEquals(leadTaskCreate.type, "perform");
  assertEquals(leadTaskCreate.idempotent, false);
});

Deno.test("lead-task-create: POST /leads/{leadId}/tasks with {name}", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: writeResult("Created", "task-1") }]);
  const result = asMutation(
    await leadTaskCreate.execute({ leadId: "l1", name: "Main task" }, ctx),
  );
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/crm/v1/leads/l1/tasks");
  assertEquals(JSON.parse(calls[0].body!), { name: "Main task" });
  assertEquals(result.id, "task-1");
});
