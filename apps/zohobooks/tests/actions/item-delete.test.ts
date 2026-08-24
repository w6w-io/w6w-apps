import { assertEquals } from "@std/assert";
import { mockBooksCtx } from "../_helpers.ts";
import action from "../../actions/item-delete.ts";

Deno.test("item-delete: DELETEs /items/{id}", async () => {
  const { ctx, calls } = mockBooksCtx([{ body: { code: 0, message: "item deleted" } }]);
  const out = await action.execute({ recordId: "9" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/books/v3/items/9");
  assertEquals(calls[0].method, "DELETE");
  assertEquals(out, { code: 0, message: "item deleted" });
});
