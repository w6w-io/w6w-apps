import type { ActionDefinition } from "@w6w/types";
import { InstantlyClient } from "../lib/client.ts";
import { campaignIdParam } from "../lib/params.ts";

/**
 * `POST /api/v2/campaigns/{id}/activate` — one endpoint covers BOTH starting
 * a draft campaign and resuming a paused one; the vendor gives them no
 * separate routes.
 */
interface Input {
  id: string;
}

const campaignActivate: ActionDefinition<Input> = {
  key: "campaign-activate",
  type: "perform",
  resource: "campaign",
  title: "Activate / Resume Campaign",
  description: "Start a draft campaign or resume a paused one — Instantly uses the same " +
    "endpoint for both.",
  idempotent: true,
  params: [campaignIdParam],
  output: [
    { key: "id", type: "string", label: "Campaign ID" },
    { key: "status", type: "number", label: "Status" },
  ],

  execute(input, ctx) {
    return new InstantlyClient(ctx).json(
      `/campaigns/${encodeURIComponent(input.id)}/activate`,
      { method: "POST" },
    );
  },
};

export default campaignActivate;
