import type { ActionDefinition } from "@w6w/types";
import { GivebutterClient } from "../lib/client.ts";
import { numericIdParam } from "../lib/params.ts";

interface Input {
  id: string;
}

const campaignGet: ActionDefinition<Input> = {
  key: "campaign-get",
  type: "read",
  resource: "campaign",
  title: "Get Campaign",
  description: "Fetch a single campaign by its numeric id.",
  params: [numericIdParam("Campaign")],
  output: [
    { key: "id", type: "string", label: "Campaign ID" },
    { key: "title", type: "string", label: "Title" },
    { key: "status", type: "string", label: "Status" },
    { key: "goal", type: "number", label: "Goal" },
    { key: "raised", type: "number", label: "Raised" },
    { key: "donors", type: "number", label: "Donors" },
    { key: "url", type: "string", label: "Public URL" },
  ],

  async execute(input, ctx) {
    return await new GivebutterClient(ctx).data(`/campaigns/${encodeURIComponent(input.id)}`);
  },
};

export default campaignGet;
