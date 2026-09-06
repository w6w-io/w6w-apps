import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/task-get.ts";

Deno.test("task-get: GETs /workflow-runs/{id}/tasks/{id} with no envelope wrapper", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      id: "t1",
      name: "Step 1",
      status: "NotCompleted",
      workflowRunId: "run1",
      hidden: false,
      stopped: false,
    },
  }]);
  const out = await action.execute({ workflowRunId: "run1", taskId: "t1" }, ctx);
  assertEquals(
    calls[0].url,
    "https://public-api.process.st/api/v1.1/workflow-runs/run1/tasks/t1",
  );
  assertEquals(out.task, {
    id: "t1",
    name: "Step 1",
    status: "NotCompleted",
    workflowRunId: "run1",
    hidden: false,
    stopped: false,
  });
});
