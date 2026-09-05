import type { ActionDefinition } from "@w6w/types";
import { OntraportClient } from "../lib/client.ts";
import { idParam } from "../lib/params.ts";

/** `GET /1/CampaignBuilderItem` — one campaign (automation)'s metadata. Read-only. */
interface Input {
  id: string;
}

const campaignGet: ActionDefinition<Input> = {
  key: "campaign-get",
  type: "read",
  resource: "campaign",
  title: "Get Campaign",
  description: "Fetch a single campaign (automation) by ID.",
  params: [idParam],
  output: [{ key: "data", type: "object", label: "The campaign" }],

  execute(input, ctx) {
    return new OntraportClient(ctx).data("/CampaignBuilderItem", { query: { id: input.id } });
  },
};

export default campaignGet;
