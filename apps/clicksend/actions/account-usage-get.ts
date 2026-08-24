import type { ActionDefinition } from "@w6w/types";
import { ClickSendClient } from "../lib/client.ts";

interface Input {
  year?: number;
  month?: number;
}

interface UsageResponse {
  [channel: string]: unknown;
  _currency?: Record<string, unknown>;
}

/**
 * `GET /account/usage/{year}/{month}/subaccount` — per-channel usage and spend for
 * one calendar month.
 *
 * The path's third segment is documented as a `type` parameter that "can only be
 * either email or subaccount" — verified live on 2026-08-24, that is wrong:
 * every value other than the literal `"subaccount"` (including the doc's own
 * `"email"`) is rejected with `400 {"response_msg":"Type must be 'subaccount' only."}`.
 * This Action does not expose `type` as a param at all; it always sends
 * `subaccount`, the only value that works.
 *
 * `year`/`month` default to the current UTC calendar month when omitted. This is
 * also the endpoint the Auth `test` hook uses to check credential liveness — see
 * `auth/basic-auth.ts` for why (no resource scoping, no credential material in
 * the response).
 */
const accountUsageGet: ActionDefinition<Input> = {
  key: "account-usage-get",
  type: "read",
  resource: "account",
  title: "Get Account Usage",
  description: "Get per-channel usage and spend for a calendar month " +
    "(GET /account/usage/{year}/{month}/subaccount).",
  params: [
    {
      key: "year",
      label: "Year",
      type: "number",
      hint: "Defaults to the current UTC year.",
    },
    {
      key: "month",
      label: "Month (1-12)",
      type: "number",
      hint: "Defaults to the current UTC month.",
    },
  ],
  output: [
    { key: "usage", type: "object", label: "Usage breakdown by channel" },
    { key: "currency", type: "object", label: "Currency" },
  ],

  async execute(input, ctx) {
    const now = new Date();
    const year = input.year ?? now.getUTCFullYear();
    const month = input.month ?? now.getUTCMonth() + 1;

    const client = new ClickSendClient(ctx);
    const usage = await client.data<UsageResponse>(`/account/usage/${year}/${month}/subaccount`);
    return { usage, currency: usage._currency };
  },
};

export default accountUsageGet;
