import type { ActionDefinition } from "@w6w/types";
import { ApolloClient, compact } from "../lib/client.ts";
import { encodeId } from "../lib/ids.ts";
import { typedCustomFieldsParam } from "../lib/params.ts";

/** `PATCH /accounts/{account_id}` — update a company already saved in your Apollo instance. */
interface Input {
  account_id: string;
  name?: string;
  domain?: string;
  owner_id?: string;
  account_stage_id?: string;
  phone?: string;
  raw_address?: string;
  typed_custom_fields?: unknown;
}

const accountUpdate: ActionDefinition<Input> = {
  key: "account-update",
  type: "perform",
  resource: "account",
  title: "Update Account",
  description: "Update fields on an account already saved in your Apollo instance.",
  // A PATCH that sets absolute field values converges to the same end state on retry.
  idempotent: true,
  params: [
    { key: "account_id", label: "Account", type: "string", required: true },
    { key: "name", label: "Name", type: "string" },
    { key: "domain", label: "Domain", type: "string" },
    { key: "owner_id", label: "Owner (Apollo user ID)", type: "string" },
    { key: "account_stage_id", label: "Account stage", type: "string" },
    { key: "phone", label: "Phone", type: "string" },
    { key: "raw_address", label: "Address", type: "string" },
    typedCustomFieldsParam,
  ],
  output: [{ key: "account", type: "object", label: "The updated account" }],

  async execute(input, ctx) {
    const body = await new ApolloClient(ctx).patch<{ account?: unknown }>(
      `/accounts/${encodeId(input.account_id)}`,
      {
        body: compact({
          name: input.name,
          domain: input.domain,
          owner_id: input.owner_id,
          account_stage_id: input.account_stage_id,
          phone: input.phone,
          raw_address: input.raw_address,
          typed_custom_fields: input.typed_custom_fields,
        }),
      },
    );
    return { account: body.account ?? null };
  },
};

export default accountUpdate;
