import type { ActionDefinition } from "@w6w/types";
import { ClickSendClient } from "../lib/client.ts";

type Input = Record<string, never>;

interface AccountResponse {
  user_id?: number;
  username?: string;
  user_email?: string;
  active?: number;
  banned?: number;
  balance?: string;
  user_phone?: string;
  user_first_name?: string;
  user_last_name?: string;
  account_name?: string;
  country?: string;
  default_country_sms?: string;
  timezone?: string;
  _currency?: Record<string, unknown>;
  _subaccount?: Record<string, unknown> | null;
  [key: string]: unknown;
}

/**
 * `GET /account` — the current account/subaccount details.
 *
 * Verified live on 2026-08-24: this endpoint's `_subaccount` object includes
 * `api_key` — a **live, working API credential** for that subaccount, returned
 * in full to any caller holding the account's own credential. A workflow step's
 * result is persisted in the run record and routinely echoed into logs and
 * previews, so returning it verbatim would turn one read into a durable
 * credential leak. This Action deletes `_subaccount.api_key` before returning;
 * everything else in the response is unchanged. (This is also why the health
 * probe in `auth/basic-auth.ts` deliberately does NOT call this endpoint.)
 *
 * `balance` is a decimal STRING (six places, e.g. `"1117.461060"`), not a number
 * — parsing it with `Number()` is safe but printing it back as a JS number can
 * silently drop trailing zeros a billing reconciliation cares about. `_currency`
 * names the unit (`currency_name_short`, e.g. `"AUD"`) — `balance` alone does not
 * say what currency it's denominated in.
 */
const accountGet: ActionDefinition<Input> = {
  key: "account-get",
  type: "read",
  resource: "account",
  title: "Get Account",
  description: "Get the current account's details and balance (GET /account).",
  params: [],
  output: [
    { key: "userId", type: "number", label: "User ID" },
    { key: "username", type: "string", label: "Username" },
    { key: "balance", type: "string", label: "Account balance (decimal string)" },
    { key: "currency", type: "object", label: "Currency" },
    { key: "account", type: "object", label: "Full account record (subaccount secret removed)" },
  ],

  async execute(_input, ctx) {
    const client = new ClickSendClient(ctx);
    const account = await client.data<AccountResponse>("/account");

    if (account._subaccount && typeof account._subaccount === "object") {
      const { api_key: _apiKey, ...rest } = account._subaccount as Record<string, unknown>;
      account._subaccount = rest;
    }

    return {
      userId: account.user_id,
      username: account.username,
      balance: account.balance,
      currency: account._currency,
      account,
    };
  },
};

export default accountGet;
