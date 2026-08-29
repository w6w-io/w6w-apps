import type { ActionDefinition } from "@w6w/types";
import { compact, SalesloftClient } from "../lib/client.ts";

interface Input {
  name?: string;
  domain?: string;
  website?: string;
  industry?: string;
  phone?: string;
  description?: string;
  ownerId?: number;
  accountTierId?: number;
  additionalFields?: Record<string, unknown>;
}

/**
 * POST /v2/accounts — create an account (company). `domain` must be unique
 * on the team. Confirmed against developers.salesloft.com/docs/api/accounts-create.
 */
const accountCreate: ActionDefinition<Input> = {
  key: "account-create",
  type: "perform",
  resource: "account",
  title: "Create Account",
  description: 'Create a new account. "domain" must be unique on the current team.',
  idempotent: false,
  params: [
    { key: "name", label: "Account name", type: "string" },
    {
      key: "domain",
      label: "Domain",
      type: "string",
      hint: "Website domain, not a full URI. Must be unique on the team.",
    },
    { key: "website", label: "Website", type: "string" },
    { key: "industry", label: "Industry", type: "string" },
    { key: "phone", label: "Phone", type: "string" },
    { key: "description", label: "Description", type: "text" },
    { key: "ownerId", label: "Owner (user ID)", type: "number" },
    { key: "accountTierId", label: "Account tier ID", type: "number" },
    {
      key: "additionalFields",
      label: "Additional fields",
      type: "json",
      advanced: true,
      hint:
        "Object of Salesloft account field names → values (e.g. city, country, size, custom_fields, tags), merged into the payload.",
    },
  ],
  output: [{ key: "data", type: "object", label: "Account" }],

  async execute(input, ctx) {
    const client = new SalesloftClient(ctx);
    return await client.request("/accounts", {
      method: "POST",
      body: compact({
        name: input.name,
        domain: input.domain,
        website: input.website,
        industry: input.industry,
        phone: input.phone,
        description: input.description,
        owner_id: input.ownerId,
        account_tier_id: input.accountTierId,
        ...(input.additionalFields ?? {}),
      }),
    });
  },
};

export default accountCreate;
