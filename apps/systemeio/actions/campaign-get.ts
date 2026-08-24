import type { ActionDefinition } from "@w6w/types";
import { SystemeClient } from "../lib/client.ts";

interface Input {
  id: string;
}

const campaignGet: ActionDefinition<Input> = {
  key: "campaign-get",
  type: "read",
  resource: "campaign",
  title: "Get Email Campaign",
  description: "Retrieve a single Campaign resource by id.",
  params: [
    { key: "id", label: "Campaign ID", type: "string", required: true },
  ],
  output: [
    { key: "id", type: "number", label: "Campaign ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "senderEmail", type: "string", label: "Sender email" },
    { key: "description", type: "string", label: "Description" },
  ],

  async execute(input, ctx) {
    return await new SystemeClient(ctx).get(
      `/api/mailing/campaigns/${encodeURIComponent(input.id)}`,
    );
  },
};

export default campaignGet;
