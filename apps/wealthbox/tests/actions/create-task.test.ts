import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/create-task.ts";

Deno.test("create-task: is a non-idempotent perform requiring name and dueDate", () => {
  assertEquals(action.type, "perform");
  assertEquals(action.idempotent, false);
  const required = (action.params ?? []).filter((p) => p.required).map((p) => p.key);
  assert(required.includes("name"));
  assert(required.includes("dueDate"));
});

Deno.test("create-task: POSTs /tasks with the mapped snake_case body, assigned to a user", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: 1 } }]);
  await action.execute({
    name: "Return Bill's call",
    dueDate: "2015-05-24 11:00 AM -0400",
    priority: "Medium",
    assignedTo: 1,
  }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/v1/tasks");
  assertEquals(JSON.parse(calls[0].body!), {
    name: "Return Bill's call",
    due_date: "2015-05-24 11:00 AM -0400",
    priority: "Medium",
    assigned_to: 1,
  });
});

Deno.test("create-task: supports assigning to a team instead of a user", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  await action.execute({ name: "Team task", dueDate: "2025-01-01", assignedToTeam: 10 }, ctx);
  const sent = JSON.parse(calls[0].body!);
  assertEquals(sent.assigned_to_team, 10);
  assertEquals(sent.assigned_to, undefined);
});

Deno.test("create-task: merges additionalProperties", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  await action.execute({
    name: "x",
    dueDate: "2025-01-01",
    additionalProperties: { custom_fields: [{ id: 1, value: "y" }] },
  }, ctx);
  assertEquals(JSON.parse(calls[0].body!).custom_fields, [{ id: 1, value: "y" }]);
});
