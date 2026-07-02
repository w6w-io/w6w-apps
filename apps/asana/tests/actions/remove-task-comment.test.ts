import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/remove-task-comment.ts";

Deno.test("remove-task-comment: DELETEs /stories/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: {} } }]);
  await action.execute({ id: "story-9" }, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(new URL(calls[0].url).pathname, "/api/1.0/stories/story-9");
  assertEquals(calls[0].body, null);
});
