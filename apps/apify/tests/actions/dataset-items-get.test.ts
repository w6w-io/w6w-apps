import { assert, assertEquals } from "@std/assert";
import datasetItemsGet from "../../actions/dataset-items-get.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

/**
 * The vendor's second documented envelope exception: the body IS the array.
 */
Deno.test("dataset-items-get: reads a bare array response, not an envelope", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ url: "a" }, { url: "b" }] }]);
  const out = await datasetItemsGet.execute({ datasetId: "d1", limit: 100 }, ctx) as {
    items: unknown[];
  };

  assertEquals(pathOf(calls[0].url), "/v2/datasets/d1/items");
  assertEquals(out.items, [{ url: "a" }, { url: "b" }]);
});

/**
 * This is the one endpoint in the API with no limit at all, so a whole scraper
 * dataset comes back by default. The prefilled limit is the guard.
 */
Deno.test("dataset-items-get: prefills a limit where the vendor applies none", () => {
  assertEquals(datasetItemsGet.params?.find((p) => p.key === "limit")?.default, 100);
});

Deno.test("dataset-items-get: shaping params reach the query string", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }]);
  await datasetItemsGet.execute(
    {
      datasetId: "d1",
      limit: 10,
      clean: true,
      fields: "url,title",
      unwind: "results",
      skipHidden: true,
    },
    ctx,
  );
  assertEquals(queryOf(calls[0].url), {
    limit: "10",
    clean: "1",
    fields: "url,title",
    unwind: "results",
    skipHidden: "1",
  });
});

/**
 * CSV, XLSX, HTML, XML and RSS are all reachable through `format`, and none of
 * them has a meaningful JSON projection for the next workflow step — so the
 * parameter is deliberately absent and the vendor default (`json`) stands.
 */
Deno.test("dataset-items-get: does not expose the non-JSON output formats", async () => {
  assertEquals(datasetItemsGet.params?.some((p) => p.key === "format"), false);
  const { ctx, calls } = mockCtx([{ body: [] }]);
  await datasetItemsGet.execute({ datasetId: "d1" }, ctx);
  assert(!("format" in queryOf(calls[0].url)));
});
