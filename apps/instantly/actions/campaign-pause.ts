import type { ActionDefinition } from "@w6w/types";
import { InstantlyClient } from "../lib/client.ts";
import { campaignIdParam } from "../lib/params.ts";

/** `POST /api/v2/campaigns/{id}/pause` — stop a campaign from sending. */
interface Input {
  id: string;
}

const campaignPause: ActionDefinition<Input> = {
  key: "campaign-pause",
  type: "perform",
  resource: "campaign",
  title: "Pause Campaign",
  description: "Stop (pause) a running campaign.",
  idempotent: true,
  params: [campaignIdParam],
  output: [
    { key: "id", type: "string", label: "Campaign ID" },
    { key: "status", type: "number", label: "Status" },
  ],

  execute(input, ctx) {
    return new InstantlyClient(ctx).json(
      `/campaigns/${encodeURIComponent(input.id)}/pause`,
      { method: "POST" },
    );
  },
};

export default campaignPause;
