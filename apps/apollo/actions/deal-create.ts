import type { ActionDefinition } from "@w6w/types";
import { ApolloClient, compact } from "../lib/client.ts";
import { typedCustomFieldsParam } from "../lib/params.ts";

/** `POST /opportunities` — create a new deal ("opportunity") in your Apollo pipeline. */
interface Input {
  name: string;
  owner_id?: string;
  account_id?: string;
  amount?: string;
  opportunity_stage_id?: string;
  closed_date?: string;
  typed_custom_fields?: unknown;
}

const dealCreate: ActionDefinition<Input> = {
  key: "deal-create",
  type: "perform",
  resource: "deal",
  title: "Create Deal",
  description: "Create a new deal in your Apollo pipeline.",
  idempotent: false,
  params: [
    { key: "name", label: "Name", type: "string", required: true },
    {
      key: "account_id",
      label: "Account",
      type: "string",
      hint: "The company this deal targets. From `account-create`/`account-search`.",
    },
    { key: "owner_id", label: "Owner (Apollo user ID)", type: "string" },
    {
      key: "amount",
      label: "Amount",
      type: "string",
      hint: "Numeric value with no commas or currency symbols, e.g. `50000`.",
    },
    {
      key: "opportunity_stage_id",
      label: "Deal stage",
      type: "string",
      hint: "From `deal-stage-list`.",
    },
    { key: "closed_date", label: "Estimated close date", type: "date" },
    typedCustomFieldsParam,
  ],
  output: [{ key: "deal", type: "object", label: "The created deal" }],

  async execute(input, ctx) {
    const body = await new ApolloClient(ctx).post<{ opportunity?: unknown }>("/opportunities", {
      body: compact({
        name: input.name,
        owner_id: input.owner_id,
        account_id: input.account_id,
        amount: input.amount,
        opportunity_stage_id: input.opportunity_stage_id,
        closed_date: input.closed_date,
        typed_custom_fields: input.typed_custom_fields,
      }),
    });
    return { deal: body.opportunity ?? null };
  },
};

export default dealCreate;
