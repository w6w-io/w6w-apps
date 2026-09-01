import { assertEquals } from "@std/assert";
import taskDelete from "../../actions/task-delete.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("task-delete: DELETEs /v2/tasks/:id", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  await taskDelete.execute({ id: 1 }, ctx);
  assertEquals(pathOf(calls[0].url), "/v2/tasks/1");
  assertEquals(calls[0].method, "DELETE");
});
