import type { ActionDefinition } from "@w6w/types";
import {
  type AvailableCredits,
  ManusClient,
  type UsageAvailableCreditsResponse,
} from "../lib/client.ts";

/**
 * `GET /v2/usage.availableCredits` — the caller's spendable credit balance,
 * subscription period and refresh information. For a team sub-account,
 * returns the team's shared pool; for a personal account, the personal
 * balance. Also the source for this app's `quota` health check and Auth
 * `test` probe — see `health/quota.ts` and `auth/api-key.ts`.
 */
const usageAvailableCredits: ActionDefinition<Record<string, never>, AvailableCredits> = {
  key: "usage-available-credits",
  type: "read",
  resource: "usage",
  title: "Get Available Credits",
  description: "Get the account's (or team's) spendable credit balance and refresh schedule.",
  params: [],
  output: [
    { key: "total_credits", type: "number", label: "Authoritative spendable balance" },
    { key: "free_credits", type: "number", label: "Free credits (sign-up gifts, grants)" },
    { key: "periodic_credits", type: "number", label: "Remaining subscription credits this cycle" },
    { key: "addon_credits", type: "number", label: "Remaining purchased add-on credits" },
    {
      key: "pro_monthly_credits",
      type: "number",
      label: "VIP monthly issuance quota (not a balance)",
    },
    { key: "event_credits", type: "number", label: "Remaining live-event credits" },
    { key: "refresh_credits", type: "number", label: "Remaining auto-refresh credits" },
    { key: "max_refresh_credits", type: "number", label: "Amount the next refresh will issue" },
    { key: "next_refresh_time", type: "number", label: "Unix seconds of the next refresh" },
    { key: "refresh_interval", type: "string", label: "daily | weekly | (none)" },
    { key: "current_period_end", type: "number", label: "Unix seconds — subscription period end" },
  ],

  async execute(_input, ctx) {
    const res = await new ManusClient(ctx).request<UsageAvailableCreditsResponse>(
      "/v2/usage.availableCredits",
    );
    return res.data;
  },
};

export default usageAvailableCredits;
