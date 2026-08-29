import { assertEquals } from "@std/assert";
import taskGet from "../../actions/task-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("task-get: GETs /tasks/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { task: { id: "t1" } } }]);
  const out = await taskGet.execute({ id: "t1" }, ctx) as { task: { id: string } };
  assertEquals(pathOf(calls[0].url), "/api/v1/tasks/t1");
  assertEquals(out.task.id, "t1");
});
