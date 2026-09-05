import type { ActionDefinition } from "@w6w/types";
import { OneSignalClient, resolveAppId } from "../lib/client.ts";

interface Input {
  limit?: number;
  offset?: number;
}

/** `GET /apps/{app_id}/segments` — verified against the OpenAPI document. */
const viewSegments: ActionDefinition<Input> = {
  key: "view-segments",
  type: "read",
  resource: "segment",
  title: "List Segments",
  description: "List the Segments defined for this app.",
  params: [
    { key: "limit", label: "Limit", type: "number", default: 300 },
    { key: "offset", label: "Offset", type: "number", default: 0 },
  ],
  output: [
    { key: "total_count", type: "number", label: "Total segments" },
    { key: "segments", type: "array", label: "Segments" },
  ],

  execute(input, ctx) {
    const appId = resolveAppId(ctx.connection);
    return new OneSignalClient(ctx).json(`/apps/${encodeURIComponent(appId)}/segments`, {
      query: { limit: input.limit ?? 300, offset: input.offset ?? 0 },
    });
  },
};

export default viewSegments;
