import { assertEquals } from "@std/assert";
import coverSearch from "../../actions/cover-search.ts";
import { items, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("cover-search: a search term becomes a path segment, not a query parameter", async () => {
  const { ctx, calls } = mockCtx([{ body: items([{ title: "Icons8", icons: [{ png: "x" }] }]) }]);
  const out = await coverSearch.execute({ text: "pokemon" }, ctx) as { items: unknown[] };

  assertEquals(pathOf(calls[0].url), "/rest/v1/collections/covers/pokemon");
  assertEquals(new URL(calls[0].url).search, "");
  assertEquals(out.items.length, 1);
});

/** No term is a different endpoint: the featured set, with no trailing segment. */
Deno.test("cover-search: an empty term falls back to the featured covers path", async () => {
  const { ctx, calls } = mockCtx([{ body: items([]) }]);
  await coverSearch.execute({ text: "  " }, ctx);

  assertEquals(pathOf(calls[0].url), "/rest/v1/collections/covers");
});

Deno.test("cover-search: a term with a slash cannot escape the path", async () => {
  const { ctx, calls } = mockCtx([{ body: items([]) }]);
  await coverSearch.execute({ text: "a/../user" }, ctx);

  assertEquals(pathOf(calls[0].url), "/rest/v1/collections/covers/a%2F..%2Fuser");
});
