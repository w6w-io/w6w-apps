import type { ActionDefinition } from "@w6w/types";
import { WebinarGeekClient } from "../lib/client.ts";

/**
 * `GET /account` — "Request information about the account linked to the API. The information is
 * derived from your API key." The whole response is `{company, email}` — nothing else is
 * documented, and nothing here is the key itself (this is also the auth `test` hook's probe;
 * see `auth/api-key.ts`).
 */
type Input = Record<string, never>;

const accountGet: ActionDefinition<Input> = {
  key: "account-get",
  type: "read",
  resource: "account",
  title: "Get Account",
  description: "Retrieve the company name and email tied to the connected API key.",
  params: [],
  output: [
    { key: "company", type: "string", label: "Company" },
    { key: "email", type: "string", label: "Email" },
  ],

  execute(_input, ctx) {
    return new WebinarGeekClient(ctx).request("/account");
  },
};

export default accountGet;
