import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/remove-task-tag.ts";

Deno.test("remove-task-tag: POSTs /tasks/{id}/removeTag with tag", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: {} } }]);
  await action.execute({ id: "t-1", tag: "tag-9" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/api/1.0/tasks/t-1/removeTag");
  assertEquals(JSON.parse(calls[0].body!), { data: { tag: "tag-9" } });
});
