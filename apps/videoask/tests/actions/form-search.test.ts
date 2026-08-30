import { assertEquals } from "@std/assert";
import formSearch from "../../actions/form-search.ts";
import { mockCtx, page, pathOf, queryOf } from "../_helpers.ts";

Deno.test("form-search: GETs /search/forms with the search term and limit", async () => {
  const { ctx, calls } = mockCtx([{
    body: page([{ id: "f1", title: "My VideoAsk" }], { count: 1 }),
  }]);
  const out = await formSearch.execute({ search: "cats", limit: 100 }, ctx) as {
    count: number;
    results: unknown[];
  };
  assertEquals(pathOf(calls[0].url), "/search/forms");
  assertEquals(queryOf(calls[0].url), { search: "cats", limit: "100" });
  assertEquals(out.count, 1);
});
