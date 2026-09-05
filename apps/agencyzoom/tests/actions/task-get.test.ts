import { assertEquals } from "@std/assert";
import taskGet from "../../actions/task-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("task-get: GET /tasks/{taskId}", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 3, title: "Call back" } }]);
  const result = await taskGet.execute({ taskId: 3 }, ctx);

  assertEquals(pathOf(calls[0].url), "/v1/api/tasks/3");
  assertEquals(result, { id: 3, title: "Call back" });
});
