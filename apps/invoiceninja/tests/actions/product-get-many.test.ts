import { assertEquals } from "@std/assert";
import { mockNinjaCtx } from "../_helpers.ts";
import action from "../../actions/product-get-many.ts";

Deno.test("product-get-many: GETs /products filtered by product key", async () => {
  const { ctx, calls } = mockNinjaCtx([{ body: { data: [] } }]);
  await action.execute({ productKey: "consulting" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/v1/products");
  assertEquals(url.searchParams.get("product_key"), "consulting");
});
