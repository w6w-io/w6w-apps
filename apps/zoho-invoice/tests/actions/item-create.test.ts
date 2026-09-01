import { assertEquals } from "@std/assert";
import { mockInvoiceCtx } from "../_helpers.ts";
import action from "../../actions/item-create.ts";

Deno.test("item-create: POSTs the fields to /items", async () => {
  const { ctx, calls } = mockInvoiceCtx([
    { body: { code: 0, message: "success", item: { item_id: "9" } } },
  ]);
  await action.execute({ fields: { name: "Consulting", rate: 150 } }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/invoice/v3/items");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), { name: "Consulting", rate: 150 });
});
