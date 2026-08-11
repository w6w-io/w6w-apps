import { assert, assertEquals } from "@std/assert";
import raindropSearch from "../../actions/raindrop-search.ts";
import { items, mockCtx, pathOf, queryOf } from "../_helpers.ts";

/**
 * The collection id is a PATH segment, and `0` — "everything except Trash" — has
 * to survive as a path segment rather than being dropped as falsy.
 */
Deno.test("raindrop-search: collection 0 reaches the path, not the query string", async () => {
  const { ctx, calls } = mockCtx([{ body: items([{ _id: 1 }]) }]);
  const out = await raindropSearch.execute({ collectionId: 0 }, ctx) as { items: unknown[] };

  assertEquals(pathOf(calls[0].url), "/rest/v1/raindrops/0");
  assertEquals(out.items.length, 1);
});

Deno.test("raindrop-search: the negative system ids survive too", async () => {
  const { ctx, calls } = mockCtx([{ body: items([]) }, { body: items([]) }]);
  await raindropSearch.execute({ collectionId: -1 }, ctx);
  await raindropSearch.execute({ collectionId: -99 }, ctx);

  assertEquals(pathOf(calls[0].url), "/rest/v1/raindrops/-1");
  assertEquals(pathOf(calls[1].url), "/rest/v1/raindrops/-99");
});

Deno.test("raindrop-search: search, sort and paging reach the query string", async () => {
  const { ctx, calls } = mockCtx([{ body: items([]) }]);
  await raindropSearch.execute(
    { collectionId: 8492393, search: "#work type:article", sort: "-created", perpage: 50, page: 2 },
    ctx,
  );

  assertEquals(queryOf(calls[0].url), {
    search: "#work type:article",
    sort: "-created",
    perpage: "50",
    page: "2",
  });
});

/**
 * `nested` is documented as opt-in and the vendor says nothing about how a
 * literal `false` is parsed, so absence expresses "off".
 */
Deno.test("raindrop-search: nested is sent only when on", async () => {
  const { ctx, calls } = mockCtx([{ body: items([]) }, { body: items([]) }]);
  await raindropSearch.execute({ collectionId: 0, nested: true }, ctx);
  await raindropSearch.execute({ collectionId: 0, nested: false }, ctx);

  assertEquals(queryOf(calls[0].url).nested, "true");
  assertEquals(queryOf(calls[1].url).nested, undefined);
});

/** 50 is the vendor's hard ceiling and is declared rather than discovered. */
Deno.test("raindrop-search: perpage is capped at the documented 50", () => {
  const perpage = raindropSearch.params?.find((p) => p.key === "perpage");
  assertEquals(perpage?.validation?.max, 50);
  assertEquals(perpage?.default, 25);
});

/** `score` is meaningless without a search term, and the label says so. */
Deno.test("raindrop-search: the relevance sort option is labelled as search-only", () => {
  const options = raindropSearch.params?.find((p) => p.key === "sort")?.options as Array<
    { value: string; label: string }
  >;
  const score = options.find((o) => o.value === "score");
  assert(/search/i.test(score?.label ?? ""), score?.label);
});
