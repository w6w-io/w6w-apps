import type { ActionDefinition } from "@w6w/types";
import { compact, SystemeClient } from "../lib/client.ts";

interface Input {
  name: string;
  senderEmail?: string;
  description?: string;
}

/**
 * `POST /api/mailing/campaigns`. This app does not manage a campaign's steps
 * (`/api/mailing/campaigns/{campaignId}/steps`, `/api/mailing/campaign-steps/{id}`)
 * — the emails themselves are authored in the systeme.io campaign editor,
 * which is out of scope for a workflow action. See the README.
 */
const campaignCreate: ActionDefinition<Input> = {
  key: "campaign-create",
  type: "perform",
  resource: "campaign",
  title: "Create Email Campaign",
  description: "Create an automated email Campaign. Its steps are authored in the campaign editor.",
  idempotent: false,
  params: [
    { key: "name", label: "Name", type: "string", required: true, validation: { maxLength: 255 } },
    {
      key: "senderEmail",
      label: "Sender email",
      type: "string",
      validation: { maxLength: 255 },
    },
    { key: "description", label: "Description", type: "text", validation: { maxLength: 2000 } },
  ],
  output: [
    { key: "id", type: "number", label: "Campaign ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "senderEmail", type: "string", label: "Sender email" },
    { key: "description", type: "string", label: "Description" },
  ],

  async execute(input, ctx) {
    return await new SystemeClient(ctx).post(
      "/api/mailing/campaigns",
      compact({ name: input.name, senderEmail: input.senderEmail, description: input.description }),
    );
  },
};

export default campaignCreate;
