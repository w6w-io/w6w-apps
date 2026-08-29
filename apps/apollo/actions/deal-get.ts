import type { ActionDefinition } from "@w6w/types";
import { ApolloClient } from "../lib/client.ts";
import { encodeId } from "../lib/ids.ts";

/** `GET /opportunities/{opportunity_id}` — one deal in your Apollo pipeline. */
interface Input {
  opportunity_id: string;
}

const dealGet: ActionDefinition<Input> = {
  key: "deal-get",
  type: "read",
  resource: "deal",
  title: "Get Deal",
  description: "Fetch one deal from your Apollo pipeline, by its Apollo ID.",
  params: [{ key: "opportunity_id", label: "Deal", type: "string", required: true }],
  output: [{ key: "deal", type: "object", label: "The deal" }],

  async execute(input, ctx) {
    const body = await new ApolloClient(ctx).get<{ opportunity?: unknown }>(
      `/opportunities/${encodeId(input.opportunity_id)}`,
    );
    return { deal: body.opportunity ?? null };
  },
};

export default dealGet;
