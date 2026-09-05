import { assertEquals } from "@std/assert";
import taskGet from "../../actions/task-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("task-get: GET /tasks/:id", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: 15, name: "Task Name" } }]);
  const out = await taskGet.execute({ id: 15 }, ctx);
  assertEquals(pathOf(calls[0].url), "/api/tasks/15");
  assertEquals(out, { id: 15, name: "Task Name" });
});
