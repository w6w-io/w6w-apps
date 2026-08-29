import type { ActionDefinition } from "@w6w/types";
import { InstantlyClient } from "../lib/client.ts";
import { campaignIdParam } from "../lib/params.ts";

/** `GET /api/v2/campaigns/{id}` — read one campaign. */
interface Input {
  id: string;
}

const campaignGet: ActionDefinition<Input> = {
  key: "campaign-get",
  type: "read",
  resource: "campaign",
  title: "Get Campaign",
  description: "Read a single campaign by ID.",
  params: [campaignIdParam],
  output: [
    { key: "id", type: "string", label: "Campaign ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "status", type: "number", label: "Status" },
  ],

  execute(input, ctx) {
    return new InstantlyClient(ctx).json(`/campaigns/${encodeURIComponent(input.id)}`);
  },
};

export default campaignGet;
