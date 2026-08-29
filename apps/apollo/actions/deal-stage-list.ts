import type { ActionDefinition } from "@w6w/types";
import { ApolloClient } from "../lib/client.ts";

/** `GET /opportunity_stages` — every deal stage configured for your team's pipeline. */
const dealStageList: ActionDefinition<Record<string, never>> = {
  key: "deal-stage-list",
  type: "read",
  resource: "deal",
  title: "List Deal Stages",
  description: "List every deal stage configured for your team's pipeline, for use with " +
    "deal-create/update.",
  params: [],
  output: [{ key: "opportunity_stages", type: "array", label: "Deal stages" }],

  async execute(_input, ctx) {
    const body = await new ApolloClient(ctx).get<{ opportunity_stages?: unknown[] }>(
      "/opportunity_stages",
    );
    return { opportunity_stages: body.opportunity_stages ?? [] };
  },
};

export default dealStageList;
