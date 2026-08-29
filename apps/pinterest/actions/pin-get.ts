import type { ActionDefinition } from "@w6w/types";
import { PinterestClient } from "../lib/client.ts";
import { adAccountIdParam, pinIdParam } from "../lib/params.ts";

/**
 * `GET /v5/pins/{pin_id}` — one Pin's metadata.
 *
 * `pin_metrics` (90-day and lifetime engagement) is left off this action's
 * params: it needs Pinterest's Ads/Analytics scopes for a full read and is a
 * genuinely separate concern (see `/pins/{pin_id}/analytics`, not built here
 * to keep the initial surface to CRUD + save + search) — a future
 * `pin-analytics-get` action can add it cleanly.
 */
interface Input {
  pinId: string;
  adAccountId?: string;
}

const pinGet: ActionDefinition<Input> = {
  key: "pin-get",
  type: "read",
  resource: "pin",
  title: "Get Pin",
  description: "Fetch one Pin's metadata by ID.",
  params: [pinIdParam, adAccountIdParam],
  output: [
    { key: "id", type: "string", label: "Pin ID" },
    { key: "title", type: "string", label: "Title" },
    { key: "description", type: "string", label: "Description" },
    { key: "link", type: "string", label: "Destination link" },
    { key: "board_id", type: "string", label: "Board ID" },
    { key: "media", type: "object", label: "Media" },
  ],

  async execute(input, ctx) {
    return await new PinterestClient(ctx).json(`/pins/${encodeURIComponent(input.pinId)}`, {
      query: { ad_account_id: input.adAccountId },
    });
  },
};

export default pinGet;
