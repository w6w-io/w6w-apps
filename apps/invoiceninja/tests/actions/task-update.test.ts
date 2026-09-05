import { assertEquals } from "@std/assert";
import { mockNinjaCtx } from "../_helpers.ts";
import action from "../../actions/task-update.ts";

Deno.test("task-update: PUTs /tasks/{id} with only the set fields", async () => {
  const { ctx, calls } = mockNinjaCtx([{ body: { id: "t1" } }]);
  await action.execute({ taskId: "t1", description: "Updated" }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.description, "Updated");
  assertEquals(body.client_id, undefined);
});
