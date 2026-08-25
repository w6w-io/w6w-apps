import { assertEquals } from "@std/assert";
import taskGet from "../../actions/task-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("task-get: calls GET /tasks/{taskKey}", async () => {
  const { ctx, calls } = mockCtx([{ body: { key: "task1" } }]);
  await taskGet.execute({ taskKey: "task1" }, ctx);
  assertEquals(pathOf(calls[0].url), "/api/v1/tasks/task1");
});
