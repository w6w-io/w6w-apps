import { assertEquals } from "@std/assert";
import taskComplete from "../../actions/task-complete.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("task-complete: POSTs to the complete endpoint", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  const out = await taskComplete.execute({ taskId: "5" }, ctx);
  assertEquals(out, { recurringTaskId: undefined });
  assertEquals(pathOf(calls[0].url), "/task/5/complete");
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].body, null, "sent a body to an endpoint that documents none");
});

/**
 * Completing a recurring task CREATES the next occurrence. A loop that
 * completes tasks and does not read this id will keep finding a new open task
 * and keep completing it.
 */
Deno.test("task-complete: surfaces the next occurrence's id for a recurring task", async () => {
  const { ctx } = mockCtx([{ body: { recurring_task_id: 6 } }]);
  assertEquals(await taskComplete.execute({ taskId: "5" }, ctx), { recurringTaskId: 6 });
});

Deno.test("task-complete: the description warns about the recurrence loop", () => {
  assertEquals((taskComplete.description ?? "").includes("completing tasks in a loop"), true);
});

Deno.test("task-complete: the webhook and stream switches reach the query string", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await taskComplete.execute({ taskId: "5", hook: false, silent: true }, ctx);
  assertEquals(queryOf(calls[0].url), { hook: "false", silent: "true" });
});

Deno.test("task-complete: is declared idempotent — a completed task stays completed", () => {
  assertEquals(taskComplete.idempotent, true);
  assertEquals(taskComplete.type, "perform");
});
