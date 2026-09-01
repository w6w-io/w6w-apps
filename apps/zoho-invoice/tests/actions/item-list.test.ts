import { assertEquals } from "@std/assert";
import { mockInvoiceCtx } from "../_helpers.ts";
import action from "../../actions/item-list.ts";

Deno.test("item-list: GETs /items and unwraps the plural key", async () => {
  const { ctx, calls } = mockInvoiceCtx([
    { body: { code: 0, message: "success", items: [{ item_id: "1" }] } },
  ]);
  const out = await action.execute({ searchText: "Consulting" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/invoice/v3/items");
  assertEquals(url.searchParams.get("search_text"), "Consulting");
  assertEquals(out.data, [{ item_id: "1" }]);
});
