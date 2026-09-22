import { assert, assertEquals } from "@std/assert";
import { envelope, mockCtx, pathOf } from "../_helpers.ts";
import action from "../../actions/task-create.ts";

Deno.test("task-create: POSTs the body to /v2/projects/{project_id}/tasks", async () => {
  const body = envelope("task", { id: 77, summary: "Ship it" });
  const { ctx, calls } = mockCtx([{ status: 200, body }]);
  const result = await action.execute!({
    project_id: 9,
    summary: "Ship it",
    assignee_ids: "651956, 651957",
    pay_rate: 20,
    metadata: [{ key: "ticket", value: "SUP-1" }],
  }, ctx) as typeof body;

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v2/projects/9/tasks");
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(JSON.parse(calls[0].body!), {
    summary: "Ship it",
    assignee_ids: [651956, 651957],
    pay_rate: 20,
    metadata: [{ key: "ticket", value: "SUP-1" }],
  });
  assertEquals(result.task.id, 77);
});

Deno.test("task-create: only summary is required, and unset fields are omitted", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: envelope("task", { id: 1 }) }]);
  await action.execute!({ project_id: 9, summary: "Only this" }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { summary: "Only this" });
  assertEquals(action.idempotent, false);
});

/** Hubstaff refuses a create in an integrated project rather than proxying it. */
Deno.test("task-create: is explicitly non-idempotent and requires organization context", () => {
  assertEquals(action.type, "perform");
  assertEquals(action.idempotent, false);
  assert(action.params!.some((p) => p.key === "project_id" && p.required === true));
});
