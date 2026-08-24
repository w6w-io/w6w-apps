import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/delete-task.ts";

Deno.test("delete-task: is an idempotent perform", () => {
  assertEquals(action.type, "perform");
  assertEquals(action.idempotent, true);
});

Deno.test("delete-task: DELETEs /tasks/{id}", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  const result = await action.execute({ taskId: 7 }, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(new URL(calls[0].url).pathname, "/v1/tasks/7");
  assertEquals(result, {});
});
