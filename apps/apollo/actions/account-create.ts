import type { ActionDefinition } from "@w6w/types";
import { ApolloClient, compact } from "../lib/client.ts";
import { typedCustomFieldsParam } from "../lib/params.ts";

/**
 * `POST /accounts` — save a new company (an "account") to your team's Apollo instance.
 *
 * Apollo applies NO deduplication here — per its own docs, creating an account with the
 * same name or domain as an existing one always creates a second, separate account.
 * Use `account-search` first if you need to check for an existing match, and
 * `account-update` to change one you already have.
 */
interface Input {
  name: string;
  domain?: string;
  owner_id?: string;
  account_stage_id?: string;
  phone?: string;
  raw_address?: string;
  typed_custom_fields?: unknown;
}

const accountCreate: ActionDefinition<Input> = {
  key: "account-create",
  type: "perform",
  resource: "account",
  title: "Create Account",
  description:
    "Save a new company to your Apollo instance. No deduplication is applied — see the " +
    "action's notes.",
  idempotent: false,
  params: [
    { key: "name", label: "Name", type: "string", required: true },
    { key: "domain", label: "Domain", type: "string", placeholder: "apollo.io" },
    {
      key: "owner_id",
      label: "Owner (Apollo user ID)",
      type: "string",
      hint: "From the `user-list` action.",
    },
    {
      key: "account_stage_id",
      label: "Account stage",
      type: "string",
      hint: "From the `account-stage-list` action.",
    },
    { key: "phone", label: "Phone", type: "string" },
    { key: "raw_address", label: "Address", type: "string", hint: "City, state and/or country." },
    typedCustomFieldsParam,
  ],
  output: [{ key: "account", type: "object", label: "The created account" }],

  async execute(input, ctx) {
    const body = await new ApolloClient(ctx).post<{ account?: unknown }>("/accounts", {
      body: compact({
        name: input.name,
        domain: input.domain,
        owner_id: input.owner_id,
        account_stage_id: input.account_stage_id,
        phone: input.phone,
        raw_address: input.raw_address,
        typed_custom_fields: input.typed_custom_fields,
      }),
    });
    return { account: body.account ?? null };
  },
};

export default accountCreate;
