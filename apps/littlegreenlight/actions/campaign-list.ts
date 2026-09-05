import type { ActionDefinition } from "@w6w/types";
import { LglClient } from "../lib/client.ts";
import { envelopeOutput, paginationParams, paginationQuery } from "../lib/params.ts";

interface Input {
  limit?: number;
  offset?: number;
}

/** `GET /api/v1/campaigns.json`. */
const campaignList: ActionDefinition<Input> = {
  key: "campaign-list",
  type: "read",
  resource: "campaign",
  title: "List Campaigns",
  description: "List campaigns on the connected LGL account.",
  params: [...paginationParams()],
  output: envelopeOutput,

  async execute(input, ctx) {
    return await new LglClient(ctx).list("/campaigns", { query: paginationQuery(input) });
  },
};

export default campaignList;
