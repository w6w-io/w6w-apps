import type { ActionDefinition } from "@w6w/types";
import { InsightlyClient } from "../lib/client.ts";

interface Input {
  opportunityId: number;
}

const opportunityGet: ActionDefinition<Input> = {
  key: "opportunity-get",
  type: "read",
  resource: "opportunity",
  title: "Get Opportunity",
  description: "Fetch a single opportunity by ID.",
  params: [
    { key: "opportunityId", label: "Opportunity ID", type: "number", required: true },
  ],
  output: [
    { key: "OPPORTUNITY_ID", type: "number", label: "Opportunity ID" },
    { key: "OPPORTUNITY_NAME", type: "string", label: "Name" },
    { key: "OPPORTUNITY_STATE", type: "string", label: "State" },
  ],

  execute(input, ctx) {
    return new InsightlyClient(ctx).request(`/Opportunities/${input.opportunityId}`);
  },
};

export default opportunityGet;
