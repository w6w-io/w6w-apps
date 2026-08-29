import type { ActionDefinition } from "@w6w/types";
import { compact, SalesloftClient } from "../lib/client.ts";

interface Input {
  id: number;
  name?: string;
  domain?: string;
  website?: string;
  industry?: string;
  phone?: string;
  description?: string;
  ownerId?: number;
  accountTierId?: number;
  archived?: boolean;
  additionalFields?: Record<string, unknown>;
}

/**
 * PUT /v2/accounts/:id — update an account. `archived: true` archives it
 * (sets `archived_at`); this is the only field unique to update vs create.
 */
const accountUpdate: ActionDefinition<Input> = {
  key: "account-update",
  type: "perform",
  resource: "account",
  title: "Update Account",
  description: 'Update an existing account. "domain" must be unique on the current team.',
  idempotent: true,
  params: [
    { key: "id", label: "Account ID", type: "number", required: true },
    { key: "name", label: "Account name", type: "string" },
    { key: "domain", label: "Domain", type: "string" },
    { key: "website", label: "Website", type: "string" },
    { key: "industry", label: "Industry", type: "string" },
    { key: "phone", label: "Phone", type: "string" },
    { key: "description", label: "Description", type: "text" },
    { key: "ownerId", label: "Owner (user ID)", type: "number" },
    { key: "accountTierId", label: "Account tier ID", type: "number" },
    {
      key: "archived",
      label: "Archived",
      type: "boolean",
      hint: "Set true to archive this account.",
    },
    {
      key: "additionalFields",
      label: "Additional fields",
      type: "json",
      advanced: true,
      hint: "Object of Salesloft account field names → values, merged into the payload.",
    },
  ],
  output: [{ key: "data", type: "object", label: "Account" }],

  async execute(input, ctx) {
    const client = new SalesloftClient(ctx);
    return await client.request(`/accounts/${input.id}`, {
      method: "PUT",
      body: compact({
        name: input.name,
        domain: input.domain,
        website: input.website,
        industry: input.industry,
        phone: input.phone,
        description: input.description,
        owner_id: input.ownerId,
        account_tier_id: input.accountTierId,
        archived: input.archived,
        ...(input.additionalFields ?? {}),
      }),
    });
  },
};

export default accountUpdate;
