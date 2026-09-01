import { assertEquals } from "@std/assert";
import action from "../../actions/business-unit-search.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("business-unit-search: sends query/country/page and lower-cased perpage", async () => {
  const { ctx, calls } = mockCtx([
    { status: 200, body: { businessUnits: [{ id: "abc", displayName: "Acme" }] } },
  ]);

  const out = await action.execute(
    { query: "acme", country: "US", page: 2, perPage: 5 },
    ctx,
  );

  assertEquals(pathOf(calls[0].url), "/v1/business-units/search");
  const q = queryOf(calls[0].url);
  assertEquals(q.query, "acme");
  assertEquals(q.country, "US");
  assertEquals(q.page, "2");
  assertEquals(q.perpage, "5");
  assertEquals(q.perPage, undefined);
  assertEquals(out.items.length, 1);
  assertEquals(out.items[0].id, "abc");
});

Deno.test("business-unit-search: an empty businessUnits list becomes an empty items array", async () => {
  const { ctx } = mockCtx([{ status: 200, body: {} }]);
  const out = await action.execute({ query: "nobody" }, ctx);
  assertEquals(out.items, []);
});
