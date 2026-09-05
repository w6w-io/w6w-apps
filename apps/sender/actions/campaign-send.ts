import type { ActionDefinition } from "@w6w/types";
import { SenderClient } from "../lib/client.ts";

/** `POST /v2/campaigns/{id}/send` — starts sending the campaign immediately. */
interface Input {
  id: string;
}

const campaignSend: ActionDefinition<Input> = {
  key: "campaign-send",
  type: "perform",
  resource: "campaign",
  title: "Send Campaign",
  description: "Start sending the campaign now.",
  idempotent: false,
  params: [{ key: "id", label: "Campaign ID", type: "string", required: true }],
  output: [
    { key: "success", type: "boolean", label: "Success" },
    { key: "message", type: "string", label: "Message" },
  ],

  execute(input, ctx) {
    return new SenderClient(ctx).data(`/campaigns/${encodeURIComponent(input.id)}/send`, {
      method: "POST",
    });
  },
};

export default campaignSend;
