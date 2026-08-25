import { assertEquals } from "@std/assert";
import search from "../../actions/search.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

/**
 * The vendor's spec marks `query` as `in: "path"` on a path literally
 * spelled `/search?query={query}` — a ReadMe.io documentation quirk. The
 * real request is `GET /search` with `query` as an ordinary query param.
 */
Deno.test("search: query is a real query-string parameter, not a path template", async () => {
  const { ctx, calls } = mockCtx([{ body: { results: {}, page: 0 } }]);
  await search.execute({ query: "Batman" }, ctx);
  assertEquals(pathOf(calls[0].url), "/api/v1/search");
  assertEquals(queryOf(calls[0].url), { query: "Batman" });
});

Deno.test("search: unwraps the doubly-nested {results: {boxes, contacts, orgs}} shape", async () => {
  const { ctx } = mockCtx([{
    body: {
      results: {
        boxes: [{ boxKey: "b1" }],
        contacts: [{ key: "c1" }],
        orgs: [{ key: "o1" }],
      },
      page: 0,
    },
  }]);
  const out = await search.execute({ query: "Batman" }, ctx) as Record<string, unknown[]>;
  assertEquals(out.boxes, [{ boxKey: "b1" }]);
  assertEquals(out.contacts, [{ key: "c1" }]);
  assertEquals(out.organizations, [{ key: "o1" }]);
});

Deno.test("search: missing result buckets come back as empty arrays", async () => {
  const { ctx } = mockCtx([{ body: { results: {}, page: 0 } }]);
  const out = await search.execute({ query: "nothing" }, ctx) as Record<string, unknown[]>;
  assertEquals(out.boxes, []);
  assertEquals(out.contacts, []);
  assertEquals(out.organizations, []);
});
