import type { ActionDefinition } from "@w6w/types";
import { CursorClient } from "../lib/client.ts";

interface Input {
  userEmail: string;
  spendLimitDollars: number | null;
}

interface SetSpendLimitResponse {
  outcome: "success" | "error";
  message: string;
}

/**
 * `POST /teams/user-spend-limit` — set (or clear) one member's individual
 * spending limit.
 *
 * Rate limited to 250 requests/minute per team — the highest limit in this
 * app, presumably because it is the one endpoint meant to be called per-user
 * in a loop. `spendLimitDollars` is a whole-dollar integer; `null` removes
 * the limit entirely, `0` sets it to $0 (blocks all overage spend). To update
 * up to 100 members in one call, use `user-spend-limits-bulk-set` instead.
 *
 * The doc documents success as HTTP 200 with `{"outcome": "success", …}` —
 * note that a request-level failure (bad email format, etc.) is ALSO answered
 * as an `"outcome": "error"` body rather than a non-2xx status in the vendor's
 * own example, so both outcomes are returned to the caller rather than one
 * being thrown as an error.
 */
const userSpendLimitSet: ActionDefinition<Input> = {
  key: "user-spend-limit-set",
  type: "perform",
  resource: "spend",
  title: "Set User Spend Limit",
  description:
    "Set an individual team member's spending limit for AI usage. The member must already be a " +
    "team member.",
  idempotent: true,
  params: [
    {
      key: "userEmail",
      label: "User email",
      type: "string",
      required: true,
      hint: "Email address of the team member. Must already be a member of your team.",
    },
    {
      key: "spendLimitDollars",
      label: "Spend limit (USD)",
      type: "number",
      hint: "Whole dollars only, no decimals. Leave empty / set to null to remove the limit " +
        "entirely. 0 sets the limit to $0.",
      validation: { integer: true, min: 0 },
    },
  ],
  output: [
    { key: "outcome", type: "string", label: "success | error" },
    { key: "message", type: "string", label: "Human-readable result" },
  ],

  execute(input, ctx) {
    return new CursorClient(ctx).post<SetSpendLimitResponse>("/teams/user-spend-limit", {
      userEmail: input.userEmail,
      spendLimitDollars: input.spendLimitDollars ?? null,
    });
  },
};

export default userSpendLimitSet;
