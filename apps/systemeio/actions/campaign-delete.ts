import type { ActionDefinition } from "@w6w/types";
import { SystemeClient } from "../lib/client.ts";

interface Input {
  id: string;
}

const campaignDelete: ActionDefinition<Input> = {
  key: "campaign-delete",
  type: "perform",
  resource: "campaign",
  title: "Delete Email Campaign",
  description: "Remove a Campaign resource.",
  idempotent: true,
  params: [
    { key: "id", label: "Campaign ID", type: "string", required: true },
  ],
  output: [
    { key: "status", type: "number", label: "HTTP status" },
  ],

  async execute(input, ctx) {
    const status = await new SystemeClient(ctx).status(
      `/api/mailing/campaigns/${encodeURIComponent(input.id)}`,
    );
    return { status };
  },
};

export default campaignDelete;
