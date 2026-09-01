import type { ActionDefinition } from "@w6w/types";
import { SellClient } from "../lib/client.ts";

/**
 * `GET /v2/accounts/self` — "read-only access to your account details" for the
 * single master account behind this connection. No secret material is present
 * in the documented response shape (id, name, currency, time/timezone format,
 * phone, subdomain, timestamps), so nothing is stripped.
 */
const accountGet: ActionDefinition<Record<string, never>> = {
  key: "account-get",
  type: "read",
  resource: "account",
  title: "Get Account",
  description: "Fetch the connected Sell account's details.",
  params: [],
  output: [
    { key: "id", type: "number", label: "Account ID" },
    { key: "name", type: "string", label: "Account name" },
    { key: "currency", type: "string", label: "Default currency (ISO 4217)" },
    { key: "timezone", type: "string", label: "Timezone" },
  ],

  async execute(_input, ctx) {
    return await new SellClient(ctx).get("/accounts/self");
  },
};

export default accountGet;
