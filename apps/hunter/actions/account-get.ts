import type { ActionDefinition } from "@w6w/types";
import { HunterClient } from "../lib/client.ts";

/**
 * `GET /v2/account` — plan, team, and current search/verification/credit
 * balances for this credential. Free of charge. The same endpoint
 * `auth/api-key.ts`'s `test` hook and `health/quota.ts` probe, exposed as an
 * ordinary action so a workflow can branch on remaining headroom itself.
 */
type Input = Record<string, never>;

const accountGet: ActionDefinition<Input> = {
  key: "account-get",
  type: "read",
  resource: "account",
  title: "Get Account Information",
  description: "Plan, team, and current search/verification/credit balances. Free of charge.",
  params: [],
  output: [
    {
      key: "data",
      type: "object",
      label: "email, plan_name, reset_date, requests{credits,searches,verifications}",
    },
  ],

  execute(_input, ctx) {
    return new HunterClient(ctx).request("/account");
  },
};

export default accountGet;
