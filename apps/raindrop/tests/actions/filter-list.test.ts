import { assert, assertEquals } from "@std/assert";
import filterList from "../../actions/filter-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

/** The reference's own sample, verbatim. */
const SAMPLE = {
  result: true,
  broken: { count: 31 },
  duplicates: { count: 7 },
  important: { count: 59 },
  notag: { count: 1366 },
  tags: [{ _id: "performanc", count: 19 }],
  types: [{ _id: "article", count: 313 }],
};

/**
 * `/filters/{id}`, NOT `/raindrops/{id}/filters` — the changelog's 1.0.4 entry
 * retired the second form, which is still what most third-party examples show.
 */
Deno.test("filter-list: reads the current /filters route, not the retired one", async () => {
  const { ctx, calls } = mockCtx([{ body: SAMPLE }]);
  const out = await filterList.execute({ collectionId: 0 }, ctx) as { broken: unknown };

  assertEquals(pathOf(calls[0].url), "/rest/v1/filters/0");
  assert(!pathOf(calls[0].url).includes("/raindrops/"), "used the retired route");
  assertEquals(out.broken, { count: 31 });
});

/** The counts arrive at the top level of the envelope, not under `item`. */
Deno.test("filter-list: lifts every counter out of the envelope", async () => {
  const { ctx } = mockCtx([{ body: SAMPLE }]);
  assertEquals(await filterList.execute({ collectionId: 0 }, ctx), {
    broken: { count: 31 },
    duplicates: { count: 7 },
    important: { count: 59 },
    notag: { count: 1366 },
    tags: [{ _id: "performanc", count: 19 }],
    types: [{ _id: "article", count: 313 }],
  });
});

Deno.test("filter-list: search and tagsSort reach the query string", async () => {
  const { ctx, calls } = mockCtx([{ body: SAMPLE }]);
  await filterList.execute({ collectionId: 8492393, search: "#work", tagsSort: "_id" }, ctx);

  assertEquals(pathOf(calls[0].url), "/rest/v1/filters/8492393");
  assertEquals(queryOf(calls[0].url), { search: "#work", tagsSort: "_id" });
});

Deno.test("filter-list: a sparse response yields zeroed counters, not undefined", async () => {
  const { ctx } = mockCtx([{ body: { result: true } }]);
  const out = await filterList.execute({ collectionId: 0 }, ctx) as Record<string, unknown>;

  assertEquals(out.broken, { count: 0 });
  assertEquals(out.tags, []);
});
