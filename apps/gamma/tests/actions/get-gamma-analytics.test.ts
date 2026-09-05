import { assertEquals } from "@std/assert";
import getGammaAnalytics from "../../actions/get-gamma-analytics.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("get-gamma-analytics: calls GET /gammas/{id}/analytics", async () => {
  const { ctx, calls } = mockCtx([
    {
      body: {
        scope: "all",
        gammaId: "g_1",
        totalViews: 42,
        uniqueViewers: 10,
        uniqueEditors: 2,
        cardCount: 8,
        lastOpened: "2026-09-01T00:00:00Z",
        dailyViews: { dayCount: 30, timezone: "UTC", days: [] },
      },
    },
  ]);
  const out = await getGammaAnalytics.execute({ gammaId: "g_1" }, ctx) as { totalViews: number };

  assertEquals(pathOf(calls[0].url), "/v1.0/gammas/g_1/analytics");
  assertEquals(out.totalViews, 42);
});
