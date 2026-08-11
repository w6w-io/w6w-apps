import { assertEquals } from "@std/assert";
import action from "../../actions/delete-tag.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("delete-tag: DELETEs /lists/{id}/tags/{tag}", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const out = await action.execute!({ listId: "l1", tag: "vip" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/lists/l1/tags/vip");
  assertEquals(calls[0].method, "DELETE");
  assertEquals(out, { deleted: true });
});

Deno.test("delete-tag: sends no request body", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  await action.execute!({ listId: "l1", tag: "vip" }, ctx);
  assertEquals(calls[0].body, null);
});
