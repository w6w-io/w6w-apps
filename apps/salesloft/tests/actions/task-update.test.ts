import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/task-update.ts";

Deno.test("task-update: PUTs /tasks/:id with a JSON body", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { id: 6 } } }]);
  await action.execute!({ id: 6, currentState: "completed" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v2/tasks/6");
  assertEquals(calls[0].method, "PUT");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.current_state, "completed");
  assertEquals(body.id, undefined);
});
