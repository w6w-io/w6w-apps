import { assertEquals } from "@std/assert";
import taskGet from "../../actions/task-get.ts";
import { dataEnvelope, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("task-get: fetches /v2/tasks/:id", async () => {
  const { ctx, calls } = mockCtx([{ body: dataEnvelope({ id: 1, completed: true }) }]);
  const out = await taskGet.execute({ id: 1 }, ctx) as Record<string, unknown>;
  assertEquals(pathOf(calls[0].url), "/v2/tasks/1");
  assertEquals(out.completed, true);
});
