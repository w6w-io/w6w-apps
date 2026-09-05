import { assertEquals } from "@std/assert";
import { mockNinjaCtx } from "../_helpers.ts";
import action from "../../actions/task-delete.ts";

Deno.test("task-delete: DELETEs /tasks/{id}", async () => {
  const { ctx, calls } = mockNinjaCtx([{ status: 204 }]);
  const out = await action.execute({ taskId: "t1" }, ctx);
  assertEquals(calls[0].url, "https://acme.invoicing.co/api/v1/tasks/t1");
  assertEquals(out, {});
});
