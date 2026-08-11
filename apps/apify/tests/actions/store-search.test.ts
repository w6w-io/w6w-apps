import { assert, assertEquals } from "@std/assert";
import storeSearch from "../../actions/store-search.ts";
import { listEnvelope, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("store-search: calls GET /v2/store with the search filters", async () => {
  const { ctx, calls } = mockCtx([{ body: listEnvelope([{ name: "web-scraper" }]) }]);
  const out = await storeSearch.execute(
    { search: "google maps", pricingModel: "FREE", limit: 20 },
    ctx,
  ) as { items: unknown[] };

  assertEquals(pathOf(calls[0].url), "/v2/store");
  assertEquals(queryOf(calls[0].url), { search: "google maps", pricingModel: "FREE", limit: "20" });
  assertEquals(out.items.length, 1);
});

/**
 * Apify's own default for `limit` here is its maximum of 1,000, against a Store
 * of 46,050 Actors — 3.8 MB in one response, measured 2026-08-11. The prefilled
 * default is the guard against a workflow step pulling that by accident.
 */
Deno.test("store-search: prefills a limit far below the vendor's 1000 default", () => {
  const limit = storeSearch.params?.find((p) => p.key === "limit");
  assertEquals(limit?.default, 20);
});

Deno.test("store-search: safety filtering stays on unless explicitly disabled", async () => {
  const { ctx, calls } = mockCtx([{ body: listEnvelope([]) }, { body: listEnvelope([]) }]);
  await storeSearch.execute({ search: "x" }, ctx);
  assert(!("includeUnrunnableActors" in queryOf(calls[0].url)));

  await storeSearch.execute({ search: "x", includeUnrunnableActors: true }, ctx);
  assertEquals(queryOf(calls[1].url).includeUnrunnableActors, "1");
});
