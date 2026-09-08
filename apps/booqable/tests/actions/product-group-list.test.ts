import { assertEquals } from "@std/assert";
import { mockBooqableCtx } from "../_helpers.ts";
import action from "../../actions/product-group-list.ts";

Deno.test("product-group-list: GETs /product_groups with filter/include/sort/page", async () => {
  const { ctx, calls } = mockBooqableCtx([{ body: { data: [] } }]);
  await action.execute({ filter: JSON.stringify({ archived: false }), sort: "name" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/4/product_groups");
  assertEquals(url.searchParams.get("filter[archived]"), "false");
  assertEquals(url.searchParams.get("sort"), "name");
});
