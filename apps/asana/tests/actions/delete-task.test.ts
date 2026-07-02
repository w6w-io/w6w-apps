import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/delete-task.ts";

Deno.test("delete-task: DELETEs /tasks/{id} with no body", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: {} } }]);
  await action.execute({ id: "t-1" }, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(new URL(calls[0].url).pathname, "/api/1.0/tasks/t-1");
  assertEquals(calls[0].body, null);
});
