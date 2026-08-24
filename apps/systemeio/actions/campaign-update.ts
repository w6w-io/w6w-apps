import type { ActionDefinition } from "@w6w/types";
import { compact, SystemeClient } from "../lib/client.ts";

interface Input {
  id: string;
  name?: string;
  senderEmail?: string;
  description?: string;
}

const campaignUpdate: ActionDefinition<Input> = {
  key: "campaign-update",
  type: "perform",
  resource: "campaign",
  title: "Update Email Campaign",
  description: "Update a Campaign's name, sender email and/or description.",
  idempotent: true,
  params: [
    { key: "id", label: "Campaign ID", type: "string", required: true },
    { key: "name", label: "Name", type: "string" },
    { key: "senderEmail", label: "Sender email", type: "string" },
    { key: "description", label: "Description", type: "text", validation: { maxLength: 2000 } },
  ],
  output: [
    { key: "id", type: "number", label: "Campaign ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "senderEmail", type: "string", label: "Sender email" },
    { key: "description", type: "string", label: "Description" },
  ],

  async execute(input, ctx) {
    return await new SystemeClient(ctx).patch(
      `/api/mailing/campaigns/${encodeURIComponent(input.id)}`,
      compact({ name: input.name, senderEmail: input.senderEmail, description: input.description }),
    );
  },
};

export default campaignUpdate;
