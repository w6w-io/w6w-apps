import { assertEquals } from "@std/assert";
import monitorSearch from "../../actions/monitor-search.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("monitor-search: calls GET /api/v1/monitor/search with the vendor's defaults", async () => {
  const { ctx, calls } = mockCtx([{
    body: { monitors: [{ id: 1 }], counts: { status: [] }, metadata: { total_count: 1 } },
  }]);
  const out = await monitorSearch.execute(
    { query: "status:Alert", page: 0, perPage: 30 },
    ctx,
  ) as { monitors: unknown[]; metadata: { total_count: number } };

  assertEquals(pathOf(calls[0].url), "/api/v1/monitor/search");
  assertEquals(queryOf(calls[0].url), { query: "status:Alert", page: "0", per_page: "30" });
  assertEquals(out.metadata.total_count, 1);
});

/**
 * The difference from `monitor-list`: this endpoint really is paginated and
 * reports totals and facet counts, where the list returns a bare array.
 */
Deno.test("monitor-search: it declares the counts and metadata the list cannot give", () => {
  const keys = (monitorSearch.output as Array<{ key: string }>).map((f) => f.key);
  assertEquals(keys.sort(), ["counts", "metadata", "monitors"]);
  assertEquals(monitorSearch.params?.find((p) => p.key === "page")?.default, 0);
  assertEquals(monitorSearch.params?.find((p) => p.key === "perPage")?.default, 30);
});

Deno.test("monitor-search: sort is passed through verbatim", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await monitorSearch.execute({ sort: "name,asc" }, ctx);
  assertEquals(queryOf(calls[0].url), { sort: "name,asc" });
});
