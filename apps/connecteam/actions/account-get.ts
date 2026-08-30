import type { ActionDefinition } from "@w6w/types";
import { ConnecteamClient } from "../lib/client.ts";

/**
 * `GET /me` — the connected company's name and id.
 *
 * The same endpoint the auth `test` hook probes (see `auth/api-key.ts`),
 * exposed here as an ordinary read too since it is a real, useful call and
 * carries no credential material to strip (`MeResponse` is exactly
 * `{companyName, companyId}`).
 */
interface Output {
  companyName: string;
  companyId: string;
}

const accountGet: ActionDefinition<Record<string, never>, Output> = {
  key: "account-get",
  type: "read",
  resource: "account",
  title: "Get Account",
  description: "Get the connected company's name and id.",
  params: [],
  output: [
    { key: "companyName", type: "string", label: "Company name" },
    { key: "companyId", type: "string", label: "Company id" },
  ],

  execute(_input, ctx) {
    return new ConnecteamClient(ctx).data<Output>("/me");
  },
};

export default accountGet;
