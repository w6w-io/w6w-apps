import { assertEquals } from "@std/assert";
import getGammaViewerDetailAnalytics from "../../actions/get-gamma-viewer-detail-analytics.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("get-gamma-viewer-detail-analytics: calls GET /gammas/{id}/analytics/viewers/{userId}", async () => {
  const { ctx, calls } = mockCtx([
    {
      body: {
        scope: "self",
        gammaId: "g_1",
        userId: "u_1",
        displayName: "Ada",
        email: "ada@example.com",
        lastOpened: "2026-09-01T00:00:00Z",
        cardsViewed: 3,
        cardCount: 5,
        perCardTimeSpent: [],
      },
    },
  ]);
  const out = await getGammaViewerDetailAnalytics.execute(
    { gammaId: "g_1", userId: "u_1" },
    ctx,
  ) as { displayName: string };

  assertEquals(pathOf(calls[0].url), "/v1.0/gammas/g_1/analytics/viewers/u_1");
  assertEquals(out.displayName, "Ada");
});
