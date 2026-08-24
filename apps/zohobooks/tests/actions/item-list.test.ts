import { assertEquals } from "@std/assert";
import { mockBooksCtx } from "../_helpers.ts";
import action from "../../actions/item-list.ts";

Deno.test("item-list: GETs /items with organization_id and a name filter", async () => {
  const { ctx, calls } = mockBooksCtx([
    { body: { code: 0, message: "success", items: [{ item_id: "1" }] } },
  ]);
  const out = await action.execute({ name: "Hard Drive" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/books/v3/items");
  assertEquals(url.searchParams.get("organization_id"), "10234695");
  assertEquals(url.searchParams.get("name_contains"), "Hard Drive");
  assertEquals(out.data, [{ item_id: "1" }]);
});
