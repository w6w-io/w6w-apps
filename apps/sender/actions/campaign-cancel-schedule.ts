import type { ActionDefinition } from "@w6w/types";
import { SenderClient } from "../lib/client.ts";

/** `DELETE /v2/campaigns/{id}/schedule` — cancels a scheduled send. */
interface Input {
  id: string;
}

const campaignCancelSchedule: ActionDefinition<Input> = {
  key: "campaign-cancel-schedule",
  type: "perform",
  resource: "campaign",
  title: "Cancel Scheduled Campaign",
  description: "Cancel a campaign that is scheduled to be sent.",
  idempotent: true,
  params: [{ key: "id", label: "Campaign ID", type: "string", required: true }],
  output: [
    { key: "success", type: "boolean", label: "Success" },
    { key: "message", type: "string", label: "Message" },
  ],

  execute(input, ctx) {
    return new SenderClient(ctx).data(`/campaigns/${encodeURIComponent(input.id)}/schedule`, {
      method: "DELETE",
    });
  },
};

export default campaignCancelSchedule;
