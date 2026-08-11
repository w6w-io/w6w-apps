import { assertEquals } from "@std/assert";
import action from "../../actions/delete-list.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("delete-list: DELETEs /lists/{id} and reports success on a bodyless 204", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const out = await action.execute!({ listId: "l1" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/lists/l1");
  assertEquals(calls[0].method, "DELETE");
  assertEquals(calls[0].body, null, "a DELETE carries no body");
  assertEquals(out, { deleted: true });
});

Deno.test("delete-list: sets no content-type when there is no body", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  await action.execute!({ listId: "l1" }, ctx);
  assertEquals(calls[0].headers["content-type"], undefined);
});
