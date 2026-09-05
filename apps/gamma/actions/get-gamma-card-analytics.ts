import type { ActionDefinition } from "@w6w/types";
import { GammaClient } from "../lib/client.ts";

/**
 * `GET /v1.0/gammas/{gammaId}/analytics/cards` — verified against
 * `analytics/get-gamma-card-analytics.md`. Requires at least edit permission;
 * `cards` covers every card, ordered by `cardPosition`, zeroed when a card has
 * no recorded activity.
 */
interface Input {
  gammaId: string;
}

const getGammaCardAnalytics: ActionDefinition<Input> = {
  key: "get-gamma-card-analytics",
  type: "read",
  resource: "analytics",
  title: "Get Gamma Card Analytics",
  description:
    "Per-card engagement for a Gamma: view time in seconds and viewer reach as a percentage, " +
    "for every card.",
  params: [
    { key: "gammaId", label: "Gamma or Doc ID", type: "string", required: true },
  ],
  output: [
    { key: "scope", type: "string", label: "all | self" },
    { key: "gammaId", type: "string", label: "Gamma (file) ID" },
    { key: "uniqueViewers", type: "number", label: "Total unique viewers" },
    { key: "uniqueEditors", type: "number", label: "Total unique editors" },
    { key: "cardCount", type: "number", label: "Number of cards" },
    {
      key: "cards",
      type: "array",
      label: "{ cardId, cardName, cardPosition, viewTimeSeconds, viewersPercent }",
    },
  ],

  execute(input, ctx) {
    return new GammaClient(ctx).request(
      `/gammas/${encodeURIComponent(input.gammaId)}/analytics/cards`,
    );
  },
};

export default getGammaCardAnalytics;
