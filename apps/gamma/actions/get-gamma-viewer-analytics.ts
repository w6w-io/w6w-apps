import type { ActionDefinition } from "@w6w/types";
import { compact, GammaClient } from "../lib/client.ts";

/**
 * `GET /v1.0/gammas/{gammaId}/analytics/viewers` — verified against
 * `analytics/get-gamma-viewer-analytics.md`. Requires at least edit
 * permission; capped at 500 viewers total, cursor-paginated.
 */
interface Input {
  gammaId: string;
  limit?: number;
  after?: string;
  sortDirection?: string;
}

const getGammaViewerAnalytics: ActionDefinition<Input> = {
  key: "get-gamma-viewer-analytics",
  type: "search",
  resource: "analytics",
  title: "Get Gamma Viewer Analytics",
  description:
    "Paginated per-viewer engagement rows for a Gamma — display name, email, last-opened " +
    "time, and cards viewed. Capped at 500 viewers total.",
  params: [
    { key: "gammaId", label: "Gamma or Doc ID", type: "string", required: true },
    {
      key: "limit",
      label: "Limit",
      type: "number",
      hint: "1-50.",
      advanced: true,
    },
    {
      key: "after",
      label: "After Cursor",
      type: "string",
      hint: "From a previous response's nextCursor.",
      advanced: true,
    },
    {
      key: "sortDirection",
      label: "Sort Direction",
      type: "select",
      options: [{ value: "desc", label: "Descending" }, { value: "asc", label: "Ascending" }],
      hint: "Applied to the viewer's most recent open time.",
      advanced: true,
    },
  ],
  output: [
    { key: "scope", type: "string", label: "all | self" },
    { key: "gammaId", type: "string", label: "Gamma (file) ID" },
    {
      key: "data",
      type: "array",
      label: "{ viewerId, displayName, email, lastOpened, cardsViewed }",
    },
    { key: "hasMore", type: "boolean", label: "More viewers exist" },
    { key: "nextCursor", type: "string", label: "Cursor for the next page" },
  ],

  execute(input, ctx) {
    return new GammaClient(ctx).request(
      `/gammas/${encodeURIComponent(input.gammaId)}/analytics/viewers`,
      {
        query: compact({
          limit: input.limit,
          after: input.after,
          sortDirection: input.sortDirection,
        }),
      },
    );
  },
};

export default getGammaViewerAnalytics;
