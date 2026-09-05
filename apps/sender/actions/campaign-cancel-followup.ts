import type { ActionDefinition } from "@w6w/types";
import { SenderClient } from "../lib/client.ts";

/** `POST /v2/campaigns/{id}/cancel_followup` — cancels a campaign's auto follow-up. */
interface Input {
  id: string;
}

const campaignCancelFollowup: ActionDefinition<Input> = {
  key: "campaign-cancel-followup",
  type: "perform",
  resource: "campaign",
  title: "Cancel Follow-Up Campaign",
  description: "Cancel the automatic follow-up campaign, if it is enabled.",
  idempotent: true,
  params: [{ key: "id", label: "Campaign ID", type: "string", required: true }],
  output: [
    { key: "success", type: "boolean", label: "Success" },
    { key: "message", type: "string", label: "Message" },
  ],

  execute(input, ctx) {
    return new SenderClient(ctx).data(
      `/campaigns/${encodeURIComponent(input.id)}/cancel_followup`,
      { method: "POST" },
    );
  },
};

export default campaignCancelFollowup;
