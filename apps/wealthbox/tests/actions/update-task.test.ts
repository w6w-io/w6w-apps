import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/update-task.ts";

Deno.test("update-task: is idempotent, and requires taskId, name and dueDate", () => {
  // Wealthbox's docs mark name/due_date required on the update endpoint too,
  // unlike Contact's genuinely-partial PUT — this pins that quirk.
  assertEquals(action.type, "perform");
  assertEquals(action.idempotent, true);
  const required = (action.params ?? []).filter((p) => p.required).map((p) => p.key);
  assert(required.includes("taskId"));
  assert(required.includes("name"));
  assert(required.includes("dueDate"));
});

Deno.test("update-task: PUTs /tasks/{id} with the mapped body", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: 1 } }]);
  await action.execute(
    { taskId: 1, name: "Follow up", dueDate: "2025-01-01", complete: true },
    ctx,
  );
  assertEquals(calls[0].method, "PUT");
  assertEquals(new URL(calls[0].url).pathname, "/v1/tasks/1");
  assertEquals(JSON.parse(calls[0].body!), {
    name: "Follow up",
    due_date: "2025-01-01",
    complete: true,
  });
});
