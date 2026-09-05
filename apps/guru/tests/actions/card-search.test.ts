import { assertEquals } from "@std/assert";
import cardSearch from "../../actions/card-search.ts";
import { linkHeader, mockCtx, pathOf, queryOf } from "../_helpers.ts";

type ListResult = { items: unknown[]; nextToken?: string };

Deno.test("card-search: hits the search endpoint with the given query params", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ id: "c1", collection: { id: "co1", token: "t" } }] }]);
  const result = await cardSearch.execute(
    { q: "onboarding", showArchived: false, sortField: "relevancy", sortOrder: "DESC" },
    ctx,
  ) as ListResult;

  assertEquals(pathOf(calls[0].url), "/api/v1/search/cardmgr");
  assertEquals(queryOf(calls[0].url), {
    q: "onboarding",
    // `false` is meaningful (not the same as "unset") and is sent, matching
    // GuruClient's own compact-on-send behaviour — see lib/client.ts.
    showArchived: "false",
    sortField: "relevancy",
    sortOrder: "DESC",
  });
  assertEquals(result.items, [{ id: "c1", collection: { id: "co1" } }]);
});

Deno.test("card-search: strips a Collection token embedded on each result", async () => {
  const { ctx } = mockCtx([{ body: [{ id: "c1", collection: { id: "co1", token: "live" } }] }]);
  const result = await cardSearch.execute({}, ctx) as ListResult;
  assertEquals((result.items[0] as { collection: { token?: string } }).collection.token, undefined);
});

Deno.test("card-search: returns nextToken from the Link header for paging", async () => {
  const { ctx } = mockCtx([{ body: [], headers: { link: linkHeader("page2") } }]);
  const result = await cardSearch.execute({}, ctx) as ListResult;
  assertEquals(result.nextToken, "page2");
});

Deno.test("card-search: a token param feeds the next page request", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }]);
  await cardSearch.execute({ token: "page2" }, ctx);
  assertEquals(queryOf(calls[0].url).token, "page2");
});
