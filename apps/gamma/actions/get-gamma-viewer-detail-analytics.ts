import type { ActionDefinition } from "@w6w/types";
import { GammaClient } from "../lib/client.ts";

/**
 * `GET /v1.0/gammas/{gammaId}/analytics/viewers/{userId}` — verified against
 * `analytics/get-gamma-viewer-detail-analytics.md`. Only authenticated
 * viewers are addressable; pass the `viewerId` from Get Gamma Viewer
 * Analytics as `userId`. Manage permission is required to address a viewer
 * other than the API key owner.
 */
interface Input {
  gammaId: string;
  userId: string;
}

const getGammaViewerDetailAnalytics: ActionDefinition<Input> = {
  key: "get-gamma-viewer-detail-analytics",
  type: "read",
  resource: "analytics",
  title: "Get Gamma Viewer Detail Analytics",
  description:
    "One authenticated viewer's engagement with a Gamma: display name, email, last-opened " +
    "time, cards viewed, and relative time spent per card.",
  params: [
    { key: "gammaId", label: "Gamma or Doc ID", type: "string", required: true },
    {
      key: "userId",
      label: "Viewer User ID",
      type: "string",
      required: true,
      hint: "The viewerId from Get Gamma Viewer Analytics.",
    },
  ],
  output: [
    { key: "scope", type: "string", label: "all | self" },
    { key: "gammaId", type: "string", label: "Gamma (file) ID" },
    { key: "userId", type: "string", label: "Viewer's user ID" },
    { key: "displayName", type: "string", label: "Viewer display name" },
    { key: "email", type: "string", label: "Viewer email" },
    { key: "lastOpened", type: "string", label: "ISO-8601 most recent open" },
    { key: "cardsViewed", type: "number", label: "Cards viewed" },
    { key: "cardCount", type: "number", label: "Total cards in the Gamma" },
    {
      key: "perCardTimeSpent",
      type: "array",
      label: "{ cardId, cardName, cardPosition, viewTimePercent }",
    },
  ],

  execute(input, ctx) {
    return new GammaClient(ctx).request(
      `/gammas/${encodeURIComponent(input.gammaId)}/analytics/viewers/` +
        encodeURIComponent(input.userId),
    );
  },
};

export default getGammaViewerDetailAnalytics;
