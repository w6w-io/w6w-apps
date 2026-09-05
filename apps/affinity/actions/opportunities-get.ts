import type { ActionDefinition } from "@w6w/types";
import { AffinityClient } from "../lib/client.ts";
import { opportunityIdPathParam } from "../lib/params.ts";

/** `GET /opportunities/{opportunity_id}`. */
interface Input {
  opportunityId: number;
}

const opportunitiesGet: ActionDefinition<Input> = {
  key: "opportunities-get",
  type: "read",
  resource: "opportunity",
  title: "Get Opportunity",
  description: "Fetch one opportunity.",
  params: [opportunityIdPathParam],
  output: [{ key: "id", type: "number", label: "Opportunity ID" }],

  execute(input, ctx) {
    return new AffinityClient(ctx).json(`/opportunities/${input.opportunityId}`);
  },
};

export default opportunitiesGet;
