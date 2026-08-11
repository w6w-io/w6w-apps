import { assertEquals } from "@std/assert";
import highlightList from "../../actions/highlight-list.ts";
import { items, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("highlight-list: no collection reads the account-wide path", async () => {
  const { ctx, calls } = mockCtx([
    { body: items([{ _id: "62388e9e48b63606f41e44a6", raindropRef: 123 }]) },
  ]);
  const out = await highlightList.execute({}, ctx) as { items: unknown[] };

  assertEquals(pathOf(calls[0].url), "/rest/v1/highlights");
  assertEquals(out.items.length, 1);
});

Deno.test("highlight-list: a collection id becomes a path segment", async () => {
  const { ctx, calls } = mockCtx([{ body: items([]) }]);
  await highlightList.execute({ collectionId: 8492393 }, ctx);

  assertEquals(pathOf(calls[0].url), "/rest/v1/highlights/8492393");
});

/**
 * Collection `0` must reach the path rather than being read as "no collection".
 * A falsy check here would silently retarget the call at the account-wide route
 * — the same answer by accident, but for the wrong reason, and wrong the day
 * `0` stops meaning "everything".
 */
Deno.test("highlight-list: collection 0 is a collection, not an absence", async () => {
  const { ctx, calls } = mockCtx([{ body: items([]) }]);
  await highlightList.execute({ collectionId: 0 }, ctx);

  assertEquals(pathOf(calls[0].url), "/rest/v1/highlights/0");
});

Deno.test("highlight-list: paging reaches the query string", async () => {
  const { ctx, calls } = mockCtx([{ body: items([]) }]);
  await highlightList.execute({ perpage: 50, page: 1 }, ctx);

  assertEquals(queryOf(calls[0].url), { perpage: "50", page: "1" });
});

/** 50 is the documented maximum, 25 the documented default. */
Deno.test("highlight-list: perpage is capped at 50 and defaults to 25", () => {
  const perpage = highlightList.params?.find((p) => p.key === "perpage");
  assertEquals(perpage?.validation?.max, 50);
  assertEquals(perpage?.default, 25);
});
