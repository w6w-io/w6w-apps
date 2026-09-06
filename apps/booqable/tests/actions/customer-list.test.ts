import { assertEquals } from "@std/assert";
import { mockBooqableCtx } from "../_helpers.ts";
import action from "../../actions/customer-list.ts";

Deno.test("customer-list: GETs /customers with flattened filter, include, sort and page", async () => {
  const { ctx, calls } = mockBooqableCtx([{ body: { data: [] } }]);
  await action.execute({
    filter: JSON.stringify({ archived: { eq: false } }),
    include: "tax_region",
    sort: "-created_at",
    pageNumber: 2,
    pageSize: 10,
  }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(calls[0].method, "GET");
  assertEquals(url.pathname, "/api/4/customers");
  assertEquals(url.searchParams.get("filter[archived][eq]"), "false");
  assertEquals(url.searchParams.get("include"), "tax_region");
  assertEquals(url.searchParams.get("sort"), "-created_at");
  assertEquals(url.searchParams.get("page[number]"), "2");
  assertEquals(url.searchParams.get("page[size]"), "10");
});

Deno.test("customer-list: works with no params at all", async () => {
  const { ctx, calls } = mockBooqableCtx([{ body: { data: [] } }]);
  await action.execute({}, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/api/4/customers");
});
