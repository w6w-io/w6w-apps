import { assertEquals } from "@std/assert";
import searchApp from "../../actions/search-app.ts";
import { bodyOf, mockCtx, pathOf, queryOf } from "../_helpers.ts";

const HITS = [{
  type: "item",
  id: 9,
  rank: 0,
  title: "Acme Ltd",
  link: "https://acme.podio.com/x",
}];

Deno.test("search-app: POSTs the query to the app search endpoint", async () => {
  const { ctx, calls } = mockCtx([{ body: HITS }]);
  assertEquals(await searchApp.execute({ appId: "123", query: "acme" }, ctx), { results: HITS });
  assertEquals(pathOf(calls[0].url), "/search/app/123/");
  assertEquals(calls[0].method, "POST");
  assertEquals(bodyOf(calls[0]), { query: "acme" });
});

Deno.test("search-app: limit, offset and ref_type go in the body; search_fields in the query", async () => {
  const { ctx, calls } = mockCtx([{ body: HITS }]);
  await searchApp.execute({
    appId: "1",
    query: "acme",
    limit: 20,
    offset: 20,
    refType: "item",
    searchFields: "title, notes",
  }, ctx);
  assertEquals(bodyOf(calls[0]), { query: "acme", limit: 20, offset: 20, ref_type: "item" });
  assertEquals(queryOf(calls[0].url), { search_fields: "title;notes" });
});

/** Podio: "up to 20 results are returned in one call" — a ceiling, not a default. */
Deno.test("search-app: the limit is capped at Podio's own hard ceiling of 20", () => {
  const limit = searchApp.params!.find((p) => p.key === "limit")!;
  assertEquals(limit.default, 20);
  assertEquals(limit.validation?.max, 20);
});

/** This endpoint searches items and tasks only, unlike the space search. */
Deno.test("search-app: offers only the two result types this endpoint can return", () => {
  const refType = searchApp.params!.find((p) => p.key === "refType")!;
  assertEquals(refType.validation?.enum, ["item", "task"]);
});

Deno.test("search-app: is a search action — this is the only text-capable read", () => {
  assertEquals(searchApp.type, "search");
});

Deno.test("search-app: an empty body yields an empty result list", async () => {
  const { ctx } = mockCtx([{ status: 200, body: "" }]);
  assertEquals(await searchApp.execute({ appId: "1", query: "x" }, ctx), { results: [] });
});
