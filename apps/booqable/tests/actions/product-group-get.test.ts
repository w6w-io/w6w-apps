import { assertEquals } from "@std/assert";
import { mockBooqableCtx } from "../_helpers.ts";
import action from "../../actions/product-group-get.ts";

Deno.test("product-group-get: GETs /product_groups/{id}", async () => {
  const { ctx, calls } = mockBooqableCtx([{ body: { data: { id: "pg1" } } }]);
  await action.execute({ productGroupId: "pg1", include: "photo" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/4/product_groups/pg1");
  assertEquals(url.searchParams.get("include"), "photo");
});
