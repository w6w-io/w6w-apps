import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/task-complete.ts";

Deno.test("task-complete: is idempotent per the spec's own PUT rule", () => {
  assertEquals(action.idempotent, true);
});

Deno.test("task-complete: PUTs status Completed", async () => {
  const { ctx, calls } = mockCtx([{ status: 204, body: undefined }]);
  const out = await action.execute({ workflowRunId: "run1", taskId: "t1" }, ctx);
  assertEquals(
    calls[0].url,
    "https://public-api.process.st/api/v1.1/workflow-runs/run1/tasks/t1",
  );
  assertEquals(calls[0].method, "PUT");
  assertEquals(JSON.parse(calls[0].body!), { status: "Completed" });
  assertEquals(out, { completed: true });
});

Deno.test("task-complete: forwards dueDate when set", async () => {
  const { ctx, calls } = mockCtx([{ status: 204, body: undefined }]);
  await action.execute(
    { workflowRunId: "run1", taskId: "t1", dueDate: "2026-09-04T00:00:00.000Z" },
    ctx,
  );
  assertEquals(JSON.parse(calls[0].body!), {
    status: "Completed",
    dueDate: "2026-09-04T00:00:00.000Z",
  });
});
