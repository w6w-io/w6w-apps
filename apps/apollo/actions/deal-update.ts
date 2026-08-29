import type { ActionDefinition } from "@w6w/types";
import { ApolloClient, compact } from "../lib/client.ts";
import { encodeId } from "../lib/ids.ts";
import { typedCustomFieldsParam } from "../lib/params.ts";

/** `PATCH /opportunities/{opportunity_id}` — update a deal in your Apollo pipeline. */
interface Input {
  opportunity_id: string;
  name?: string;
  owner_id?: string;
  amount?: string;
  opportunity_stage_id?: string;
  closed_date?: string;
  typed_custom_fields?: unknown;
}

const dealUpdate: ActionDefinition<Input> = {
  key: "deal-update",
  type: "perform",
  resource: "deal",
  title: "Update Deal",
  description: "Update fields on a deal in your Apollo pipeline.",
  // A PATCH that sets absolute field values converges to the same end state on retry.
  idempotent: true,
  params: [
    { key: "opportunity_id", label: "Deal", type: "string", required: true },
    { key: "name", label: "Name", type: "string" },
    { key: "owner_id", label: "Owner (Apollo user ID)", type: "string" },
    { key: "amount", label: "Amount", type: "string", hint: "No commas or currency symbols." },
    { key: "opportunity_stage_id", label: "Deal stage", type: "string" },
    { key: "closed_date", label: "Estimated close date", type: "date" },
    typedCustomFieldsParam,
  ],
  output: [{ key: "deal", type: "object", label: "The updated deal" }],

  async execute(input, ctx) {
    const body = await new ApolloClient(ctx).patch<{ opportunity?: unknown }>(
      `/opportunities/${encodeId(input.opportunity_id)}`,
      {
        body: compact({
          name: input.name,
          owner_id: input.owner_id,
          amount: input.amount,
          opportunity_stage_id: input.opportunity_stage_id,
          closed_date: input.closed_date,
          typed_custom_fields: input.typed_custom_fields,
        }),
      },
    );
    return { deal: body.opportunity ?? null };
  },
};

export default dealUpdate;
