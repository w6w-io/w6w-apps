import { assertEquals } from "@std/assert";
import { envelope, mockCtx, pathOf } from "../_helpers.ts";
import action from "../../actions/task-get.ts";

Deno.test("task-get: GETs /v2/tasks/{task_id} and surfaces lock_version", async () => {
  const body = envelope("task", { id: 1, summary: "Ship it", lock_version: 3 });
  const { ctx, calls } = mockCtx([{ status: 200, body }]);
  const result = await action.execute!({ task_id: 1 }, ctx) as typeof body;

  assertEquals(pathOf(calls[0].url), "/v2/tasks/1");
  assertEquals(result.task.lock_version, 3);
});
