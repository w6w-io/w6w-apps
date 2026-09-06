import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/task-list.ts";

Deno.test("task-list: GETs /workflow-runs/{id}/tasks", async () => {
  const task = {
    id: "t1",
    name: "Step 1",
    status: "NotCompleted",
    workflowRunId: "run1",
    hidden: false,
    stopped: false,
  };
  const { ctx, calls } = mockCtx([{ body: { tasks: [task] } }]);
  const out = await action.execute({ workflowRunId: "run1" }, ctx);
  assertEquals(calls[0].url, "https://public-api.process.st/api/v1.1/workflow-runs/run1/tasks");
  assertEquals(out.tasks, [task]);
});

Deno.test("task-list: forwards the cursor and extracts nextCursor", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      tasks: [],
      links: [{
        name: "next",
        href: "https://public-api.process.st/api/v1.1/workflow-runs/run1/tasks?_=t2",
        type: "Api",
      }],
    },
  }]);
  const out = await action.execute({ workflowRunId: "run1", cursor: "t1" }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("_"), "t1");
  assertEquals(out.nextCursor, "t2");
});
