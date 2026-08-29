import { assertEquals } from "@std/assert";
import taskSkip from "../../actions/task-skip.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("task-skip: POSTs to /tasks/{id}/skip", async () => {
  const { ctx, calls } = mockCtx([{ body: { task: { id: "t1", status: "skipped" } } }]);
  const out = await taskSkip.execute({ id: "t1", note: "No longer a fit" }, ctx) as {
    task: { status: string };
  };
  assertEquals(pathOf(calls[0].url), "/api/v1/tasks/t1/skip");
  assertEquals(JSON.parse(calls[0].body!), { note: "No longer a fit" });
  assertEquals(out.task.status, "skipped");
});

Deno.test("task-skip: idempotent", () => {
  assertEquals(taskSkip.idempotent, true);
});
