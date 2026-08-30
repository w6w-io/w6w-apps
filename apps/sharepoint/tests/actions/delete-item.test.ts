import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/delete-item.ts";

Deno.test("delete-item: DELETEs {site}/lists/{list-id}/items/{item-id}", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const out = await action.execute({ listId: "L1", itemId: "42" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v1.0/sites/root/lists/L1/items/42");
  assertEquals(calls[0].method, "DELETE");
  assertEquals(out, { status: 204 });
});

Deno.test("delete-item: if-match rides as a header when supplied", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  await action.execute({ listId: "L1", itemId: "42", ifMatch: '"abc"' }, ctx);
  assertEquals(calls[0].headers["if-match"], '"abc"');
});

Deno.test("delete-item: is idempotent — gone is gone", () => {
  assertEquals(action.idempotent, true);
});
