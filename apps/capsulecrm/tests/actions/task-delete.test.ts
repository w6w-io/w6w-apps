import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/task-delete.ts";

Deno.test("task-delete: DELETEs /tasks/{id}", async () => {
  const { ctx, calls } = mockCtx([{ status: 204, body: undefined }]);
  const out = await action.execute({ taskId: 530 }, ctx);
  assertEquals(calls[0].url, "https://api.capsulecrm.com/api/v2/tasks/530");
  assertEquals(calls[0].method, "DELETE");
  assertEquals(out, {});
});
