import { assert, assertEquals } from "@std/assert";
import raindropGet from "../../actions/raindrop-get.ts";
import { item, mockCtx, pathOf } from "../_helpers.ts";

/**
 * Singular. `/raindrops/{id}` is the collection-listing route and would read the
 * raindrop id as a *collection* id — returning an empty list rather than an
 * error, which is the worst possible failure mode.
 */
Deno.test("raindrop-get: reads the SINGULAR raindrop path", async () => {
  const { ctx, calls } = mockCtx([{ body: item({ _id: 373777232, link: "https://x" }) }]);
  const out = await raindropGet.execute({ raindropId: 373777232 }, ctx) as { item: unknown };

  assertEquals(pathOf(calls[0].url), "/rest/v1/raindrop/373777232");
  assert(!pathOf(calls[0].url).includes("/raindrops/"), "used the plural collection route");
  assertEquals(out.item, { _id: 373777232, link: "https://x" });
});

/**
 * Highlights are a field of the raindrop, not a resource with its own read path
 * — this call is what the reference means by "Get highlights of raindrop".
 */
Deno.test("raindrop-get: returns the highlights carried on the bookmark", async () => {
  const { ctx } = mockCtx([
    { body: item({ _id: 1, highlights: [{ _id: "62388e9e48b63606f41e44a6", text: "quote" }] }) },
  ]);
  const out = await raindropGet.execute({ raindropId: 1 }, ctx) as {
    item: { highlights: unknown[] };
  };
  assertEquals(out.item.highlights.length, 1);
});
