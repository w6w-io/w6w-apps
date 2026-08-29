import { assertEquals } from "@std/assert";
import dealList from "../../actions/deal-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("deal-list: GETs /opportunities/search with plain query params", async () => {
  const { ctx, calls } = mockCtx([
    { body: { opportunities: [{ id: "d1" }], pagination: { total_entries: 1 } } },
  ]);
  const out = await dealList.execute({ page: 2, per_page: 10 }, ctx) as {
    deals: unknown[];
    pagination: { total_entries: number };
  };
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/api/v1/opportunities/search");
  assertEquals(queryOf(calls[0].url).page, "2");
  assertEquals(out.deals.length, 1);
  assertEquals(out.pagination.total_entries, 1);
});
