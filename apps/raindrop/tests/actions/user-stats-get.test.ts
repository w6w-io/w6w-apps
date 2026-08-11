import { assertEquals } from "@std/assert";
import userStatsGet from "../../actions/user-stats-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

/** The reference's own sample, verbatim. */
const SAMPLE = {
  items: [{ _id: 0, count: 1570 }, { _id: -1, count: 34 }, { _id: -99, count: 543 }],
  meta: {
    pro: true,
    _id: 32,
    changedBookmarksDate: "2020-02-11T11:23:43.143Z",
    duplicates: { count: 3 },
    broken: { count: 31 },
  },
  result: true,
};

/**
 * `items` and `meta` sit at the top level of the envelope, not under `item`, so
 * both have to be lifted out explicitly.
 */
Deno.test("user-stats-get: lifts items and meta out of the envelope", async () => {
  const { ctx, calls } = mockCtx([{ body: SAMPLE }]);
  const out = await userStatsGet.execute({}, ctx) as { items: unknown[]; meta: unknown };

  assertEquals(pathOf(calls[0].url), "/rest/v1/user/stats");
  assertEquals(out.items, SAMPLE.items);
  assertEquals(out.meta, SAMPLE.meta);
});

/**
 * This is the only endpoint that reports the sizes of the three system
 * collections — the ids no collection listing ever returns.
 */
Deno.test("user-stats-get: reports the system collections nothing else lists", async () => {
  const { ctx } = mockCtx([{ body: SAMPLE }]);
  const out = await userStatsGet.execute({}, ctx) as { items: Array<{ _id: number }> };

  assertEquals(out.items.map((i) => i._id), [0, -1, -99]);
});

Deno.test("user-stats-get: a response with neither key yields empty defaults", async () => {
  const { ctx } = mockCtx([{ body: { result: true } }]);
  assertEquals(await userStatsGet.execute({}, ctx), { items: [], meta: {} });
});
