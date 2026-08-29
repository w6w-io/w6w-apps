import type { ActionDefinition } from "@w6w/types";
import { DialpadClient } from "../lib/client.ts";

/**
 * `GET /api/v2/company` — company name, primary office, admin contact, plan
 * state and billing address.
 *
 * The spec tags this `x-access: admin` — a company admin API key is required,
 * and a user-level key gets a `403` here even though the Connection itself is
 * fine. This is why the Auth `test` probe uses `GET /api/v2/offices` instead
 * (see `auth/api-key.ts`), which both key types can reach.
 */
type Input = Record<string, never>;

const companyGet: ActionDefinition<Input> = {
  key: "company-get",
  type: "read",
  resource: "company",
  title: "Get Company",
  description: "Get company information. Requires a company admin API key.",
  params: [],
  output: [
    { key: "id", type: "string", label: "Company ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "account_type", type: "string", label: "Pricing tier" },
    { key: "state", type: "string", label: "Enablement state" },
  ],

  execute(_input, ctx) {
    return new DialpadClient(ctx).json("/company");
  },
};

export default companyGet;
