import { assertEquals } from "@std/assert";
import pinSearch from "../../actions/pin-search.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("pin-search: calls GET /search/pins with the query param", async () => {
  const { ctx, calls } = mockCtx([{ body: { items: [{ id: "1" }], bookmark: null } }]);
  const out = await pinSearch.execute({ query: "recipes" }, ctx) as { items: unknown[] };

  assertEquals(pathOf(calls[0].url), "/v5/search/pins");
  assertEquals(queryOf(calls[0].url).query, "recipes");
  assertEquals(out.items.length, 1);
});
