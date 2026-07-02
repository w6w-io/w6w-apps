import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/delete-project.ts";

Deno.test("delete-project: DELETEs /projects/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: {} } }]);
  await action.execute({ id: "p-1" }, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(new URL(calls[0].url).pathname, "/api/1.0/projects/p-1");
  assertEquals(calls[0].body, null);
});
