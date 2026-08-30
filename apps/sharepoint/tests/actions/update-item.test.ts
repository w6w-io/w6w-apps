import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/update-item.ts";

Deno.test("update-item: PATCHes {site}/lists/{list-id}/items/{item-id}/fields", async () => {
  const { ctx, calls } = mockCtx([{ body: { Color: "Purple" } }]);
  await action.execute(
    { listId: "L1", itemId: "42", fields: { Color: "Purple", Quantity: 5 } },
    ctx,
  );
  assertEquals(new URL(calls[0].url).pathname, "/v1.0/sites/root/lists/L1/items/42/fields");
  assertEquals(calls[0].method, "PATCH");
  assertEquals(JSON.parse(calls[0].body!), { Color: "Purple", Quantity: 5 });
});

Deno.test("update-item: if-match rides as a header when supplied, and is absent otherwise", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }, { body: {} }]);
  await action.execute({ listId: "L1", itemId: "42", fields: {}, ifMatch: '"abc"' }, ctx);
  assertEquals(calls[0].headers["if-match"], '"abc"');

  await action.execute({ listId: "L1", itemId: "42", fields: {} }, ctx);
  assertEquals("if-match" in calls[1].headers, false);
});

Deno.test("update-item: is idempotent — a PATCH sets an end state", () => {
  assertEquals(action.idempotent, true);
});
