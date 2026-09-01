import { assertEquals } from "@std/assert";
import { mockInvoiceCtx } from "../_helpers.ts";
import action from "../../actions/item-update.ts";

Deno.test("item-update: PUTs the fields to /items/{id}", async () => {
  const { ctx, calls } = mockInvoiceCtx([
    { body: { code: 0, message: "success", item: { item_id: "9" } } },
  ]);
  await action.execute({ recordId: "9", fields: { rate: 175 } }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/invoice/v3/items/9");
  assertEquals(calls[0].method, "PUT");
  assertEquals(JSON.parse(calls[0].body!), { rate: 175 });
});
