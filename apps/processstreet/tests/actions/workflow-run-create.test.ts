import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/workflow-run-create.ts";

Deno.test("workflow-run-create: is not idempotent (no referenceId dedupe exists)", () => {
  assertEquals(action.idempotent, false);
});

Deno.test("workflow-run-create: POSTs /workflow-runs with the compacted body", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "run1" } }]);
  const out = await action.execute({ workflowId: "w1", name: "Q1 Audit" }, ctx);
  assertEquals(calls[0].url, "https://public-api.process.st/api/v1.1/workflow-runs");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), { workflowId: "w1", name: "Q1 Audit" });
  assertEquals(out, { workflowRunId: "run1" });
});

Deno.test("workflow-run-create: omits undefined optional fields entirely", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "run2" } }]);
  await action.execute({ workflowId: "w1" }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { workflowId: "w1" });
});

Deno.test("workflow-run-create: forwards dueDate and shared when set", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "run3" } }]);
  await action.execute(
    { workflowId: "w1", dueDate: "2026-04-01T00:00:00.000Z", shared: true },
    ctx,
  );
  assertEquals(JSON.parse(calls[0].body!), {
    workflowId: "w1",
    dueDate: "2026-04-01T00:00:00.000Z",
    shared: true,
  });
});
