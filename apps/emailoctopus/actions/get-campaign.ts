import type { ActionDefinition } from "@w6w/types";
import { EmailOctopusClient, seg } from "../lib/client.ts";

interface Input {
  campaignId: string;
}

/** `GET /campaigns/{campaign_id}`. */
const getCampaign: ActionDefinition<Input> = {
  key: "get-campaign",
  type: "read",
  resource: "campaign",
  title: "Get Campaign",
  description:
    "Fetch a single campaign by id, including its subject, sender, recipient list ids and HTML content.",
  params: [
    {
      key: "campaignId",
      label: "Campaign ID",
      type: "string",
      required: true,
      placeholder: "00000000-0000-0000-0000-000000000000",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Campaign ID" },
    { key: "status", type: "string", label: "draft | sending | sent | error" },
    { key: "name", type: "string", label: "Internal name" },
    { key: "subject", type: "string", label: "Subject line" },
    { key: "to", type: "array", label: "Recipient list ids" },
    { key: "from", type: "object", label: "Sender name and email address" },
    { key: "content", type: "object", label: "Campaign content (`content.html`)" },
    { key: "created_at", type: "string", label: "Created at (ISO 8601)" },
    { key: "sent_at", type: "string", label: "Sent at (ISO 8601), null while unsent" },
  ],

  execute(input, ctx) {
    return new EmailOctopusClient(ctx).request(`/campaigns/${seg(input.campaignId)}`);
  },
};

export default getCampaign;
