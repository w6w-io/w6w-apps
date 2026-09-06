import { assertEquals } from "@std/assert";
import { mockBooqableCtx } from "../_helpers.ts";
import action from "../../actions/product-search.ts";

Deno.test("product-search: POSTs /products/search with the filter tree in the body", async () => {
  const { ctx, calls } = mockBooqableCtx([{ body: { data: [{ id: "1" }] } }]);
  await action.execute({ filter: JSON.stringify({ name: { prefix: "iPad" } }) }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/api/4/products/search");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.filter.name.prefix, "iPad");
});
