import { assertEquals } from "@std/assert";
import getGammaViewerAnalytics from "../../actions/get-gamma-viewer-analytics.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("get-gamma-viewer-analytics: calls GET /gammas/{id}/analytics/viewers with paging", async () => {
  const { ctx, calls } = mockCtx([
    { body: { scope: "all", gammaId: "g_1", data: [], hasMore: false, nextCursor: null } },
  ]);
  await getGammaViewerAnalytics.execute(
    { gammaId: "g_1", limit: 10, sortDirection: "desc" },
    ctx,
  );

  assertEquals(pathOf(calls[0].url), "/v1.0/gammas/g_1/analytics/viewers");
  assertEquals(queryOf(calls[0].url), { limit: "10", sortDirection: "desc" });
});
