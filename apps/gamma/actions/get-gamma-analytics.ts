import type { ActionDefinition } from "@w6w/types";
import { GammaClient } from "../lib/client.ts";

/**
 * `GET /v1.0/gammas/{gammaId}/analytics` — verified against
 * `analytics/get-gamma-analytics.md`. Requires at least edit permission;
 * `scope` in the response tells you whether the numbers cover every viewer
 * (`"all"`, needs manage permission) or only the API key owner's own activity
 * (`"self"`, edit permission). Data is eventually consistent (~hourly).
 */
interface Input {
  gammaId: string;
}

const getGammaAnalytics: ActionDefinition<Input> = {
  key: "get-gamma-analytics",
  type: "read",
  resource: "analytics",
  title: "Get Gamma Analytics",
  description:
    "Doc-level engagement metrics for a Gamma: total views, unique viewers/editors, card " +
    "count, last opened time, and a 30-day daily unique-viewer breakdown.",
  params: [
    { key: "gammaId", label: "Gamma or Doc ID", type: "string", required: true },
  ],
  output: [
    { key: "scope", type: "string", label: "all | self" },
    { key: "gammaId", type: "string", label: "Gamma (file) ID" },
    { key: "totalViews", type: "number", label: "Total view events, including repeats" },
    { key: "uniqueViewers", type: "number", label: "Unique viewers" },
    { key: "uniqueEditors", type: "number", label: "Unique editors" },
    { key: "cardCount", type: "number", label: "Number of cards" },
    { key: "lastOpened", type: "string", label: "ISO-8601 most recent view, or null" },
    {
      key: "dailyViews",
      type: "object",
      label: "{ dayCount, timezone, days: [{date, uniqueViewers}] }",
    },
  ],

  execute(input, ctx) {
    return new GammaClient(ctx).request(`/gammas/${encodeURIComponent(input.gammaId)}/analytics`);
  },
};

export default getGammaAnalytics;
