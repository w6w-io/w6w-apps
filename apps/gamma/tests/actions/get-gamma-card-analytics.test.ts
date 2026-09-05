import { assertEquals } from "@std/assert";
import getGammaCardAnalytics from "../../actions/get-gamma-card-analytics.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("get-gamma-card-analytics: calls GET /gammas/{id}/analytics/cards", async () => {
  const { ctx, calls } = mockCtx([
    {
      body: {
        scope: "self",
        gammaId: "g_1",
        uniqueViewers: 5,
        uniqueEditors: 1,
        cardCount: 2,
        cards: [{
          cardId: "c1",
          cardName: "Intro",
          cardPosition: 1,
          viewTimeSeconds: 12,
          viewersPercent: 80,
        }],
      },
    },
  ]);
  const out = await getGammaCardAnalytics.execute({ gammaId: "g_1" }, ctx) as {
    cards: Array<{ cardId: string }>;
  };

  assertEquals(pathOf(calls[0].url), "/v1.0/gammas/g_1/analytics/cards");
  assertEquals(out.cards[0].cardId, "c1");
});
