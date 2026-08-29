import { assertEquals } from "@std/assert";
import taskComplete from "../../actions/task-complete.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("task-complete: POSTs to /tasks/{id}/complete", async () => {
  const { ctx, calls } = mockCtx([{ body: { task: { id: "t1", status: "completed" } } }]);
  const out = await taskComplete.execute({ id: "t1", note: "Done" }, ctx) as {
    task: { status: string };
  };
  assertEquals(pathOf(calls[0].url), "/api/v1/tasks/t1/complete");
  assertEquals(JSON.parse(calls[0].body!), { note: "Done" });
  assertEquals(out.task.status, "completed");
});

Deno.test("task-complete: idempotent", () => {
  assertEquals(taskComplete.idempotent, true);
});
