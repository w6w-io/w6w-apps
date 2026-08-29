import type { ActionDefinition } from "@w6w/types";
import { idempotencyHeaders, WhopClient } from "../lib/client.ts";
import { membershipIdParam } from "../lib/params.ts";

/**
 * `POST /memberships/{id}/cancel`.
 *
 * `cancelAtPeriodEnd: true` stops auto-renewal and keeps access until the
 * current billing period ends; omit it (or send `false`) to revoke access
 * immediately. Buyers cannot cancel buy-now-pay-later (`splitit`, `sezzle`) or
 * non-trial split-pay memberships — Whop reports that as a `409`.
 *
 * This endpoint documents its own `Idempotency-Key` support, so a retry of
 * the same runtime step replays the original cancellation instead of
 * double-firing it — see `lib/client.ts`'s `idempotencyHeaders`.
 */
interface Input {
  membershipId: string;
  cancelAtPeriodEnd?: boolean;
  reason?: string;
}

const membershipCancel: ActionDefinition<Input> = {
  key: "membership-cancel",
  type: "perform",
  resource: "membership",
  title: "Cancel Membership",
  description: "Cancel a membership, immediately or at the end of the current billing period.",
  idempotent: true,
  params: [
    membershipIdParam,
    {
      key: "cancelAtPeriodEnd",
      label: "Cancel at period end",
      type: "boolean",
      hint: "Stops auto-renewal and keeps access until the current billing period ends. " +
        "Leave off to revoke access immediately.",
    },
    {
      key: "reason",
      label: "Reason",
      type: "string",
      hint: "Free-form note recording why the membership was canceled.",
    },
  ],
  output: [{ key: "data", type: "object", label: "The canceled membership" }],

  execute(input, ctx) {
    return new WhopClient(ctx).post(
      `/memberships/${encodeURIComponent(input.membershipId)}/cancel`,
      { cancel_at_period_end: input.cancelAtPeriodEnd, reason: input.reason },
      idempotencyHeaders(ctx)["Idempotency-Key"],
    );
  },
};

export default membershipCancel;
