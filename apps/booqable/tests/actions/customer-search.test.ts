import { assertEquals } from "@std/assert";
import { mockBooqableCtx } from "../_helpers.ts";
import action from "../../actions/customer-search.ts";

Deno.test("customer-search: POSTs /customers/search with the filter tree in the body", async () => {
  const { ctx, calls } = mockBooqableCtx([{ body: { data: [{ id: "1" }] } }]);
  await action.execute({
    filter: JSON.stringify({
      operator: "and",
      attributes: [{ operator: "or", attributes: [{ name: "john" }, { name: "jane" }] }],
    }),
    pageSize: 5,
  }, ctx);
  assertEquals(calls[0].method, "POST");
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/4/customers/search");
  assertEquals(url.searchParams.get("page[size]"), "5");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.filter.operator, "and");
  assertEquals(body.filter.attributes[0].attributes.length, 2);
});
