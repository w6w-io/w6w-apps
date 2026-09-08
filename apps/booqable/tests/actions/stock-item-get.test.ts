import { assertEquals } from "@std/assert";
import { mockBooqableCtx } from "../_helpers.ts";
import action from "../../actions/stock-item-get.ts";

Deno.test("stock-item-get: GETs /stock_items/{id}", async () => {
  const { ctx, calls } = mockBooqableCtx([{ body: { data: { id: "si1" } } }]);
  await action.execute({ stockItemId: "si1", include: "product" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/4/stock_items/si1");
  assertEquals(url.searchParams.get("include"), "product");
});
