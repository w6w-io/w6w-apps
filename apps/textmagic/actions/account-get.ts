import type { ActionDefinition } from "@w6w/types";
import { TextMagicClient } from "../lib/client.ts";

/**
 * `GET /api/v2/user` — the account behind this connection.
 *
 * Returns profile fields (`username`, `email`, `company`), the account
 * `balance` (in account currency — also read by `health/quota.ts`), and
 * `subaccountType` (`P` parent, `A` admin sub-account, `U` regular user).
 * Nothing in the response is a credential: unlike Apify's `/users/me` (whose
 * `proxy.password` is a live proxy credential), TextMagic's account payload is
 * plain profile + billing data.
 */
const accountGet: ActionDefinition<Record<string, never>> = {
  key: "account-get",
  type: "read",
  resource: "account",
  title: "Get Account",
  description: "Fetch the connected TextMagic account's profile, status and balance.",
  params: [],
  output: [
    { key: "id", type: "number", label: "User ID" },
    { key: "username", type: "string", label: "Username" },
    { key: "email", type: "string", label: "Email" },
    { key: "status", type: "string", label: "A (Active) or T (Trial)" },
    { key: "balance", type: "number", label: "Account balance, in account currency" },
    { key: "currency", type: "object", label: "Account currency" },
    { key: "country", type: "object", label: "Account country" },
    { key: "subaccountType", type: "string", label: "P (Parent) / A (Admin) / U (Regular user)" },
  ],

  execute(_input, ctx) {
    return new TextMagicClient(ctx).json("/user");
  },
};

export default accountGet;
