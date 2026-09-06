import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/task-list-by-assignee.ts";

Deno.test("task-list-by-assignee: requires assigneeEmail", () => {
  const req = action.params?.find((p) => p.key === "assigneeEmail");
  assertEquals(req?.required, true);
});

Deno.test("task-list-by-assignee: GETs /tasks with assigneeEmail and optional workflowId", async () => {
  const task = { id: "t1", name: "Step 1", status: "NotCompleted", workflowRunId: "run1" };
  const { ctx, calls } = mockCtx([{ body: { tasks: [task] } }]);
  const out = await action.execute(
    { assigneeEmail: "jane.doe@example.com", workflowId: "w1" },
    ctx,
  );
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/v1.1/tasks");
  assertEquals(url.searchParams.get("assigneeEmail"), "jane.doe@example.com");
  assertEquals(url.searchParams.get("workflowId"), "w1");
  assertEquals(out.tasks, [task]);
});
