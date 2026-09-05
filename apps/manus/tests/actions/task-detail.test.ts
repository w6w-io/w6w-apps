import { assertEquals } from "@std/assert";
import taskDetail from "../../actions/task-detail.ts";
import { mockCtx, okBody, pathOf, queryOf } from "../_helpers.ts";

Deno.test("task-detail: gets /v2/task.detail with task_id as a query param", async () => {
  const { ctx, calls } = mockCtx([{ body: okBody({ task: { id: "t1", status: "running" } }) }]);
  await taskDetail.execute({ taskId: "t1" }, ctx);

  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v2/task.detail");
  assertEquals(queryOf(calls[0].url), { task_id: "t1" });
});

Deno.test("task-detail: returns the task object, unwrapped from the envelope", async () => {
  const task = { id: "t1", status: "waiting" as const, created_at: 1, updated_at: 2 };
  const { ctx } = mockCtx([{ body: okBody({ task }) }]);
  const out = await taskDetail.execute({ taskId: "t1" }, ctx);
  assertEquals(out, task);
});

Deno.test("task-detail: is a read action", () => {
  assertEquals(taskDetail.type, "read");
});
