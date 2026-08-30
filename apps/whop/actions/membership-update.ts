import type { ActionDefinition } from "@w6w/types";
import { asOptionalJson, WhopClient } from "../lib/client.ts";
import { membershipIdParam } from "../lib/params.ts";

/**
 * `PATCH /memberships/{id}` — merge metadata, or toggle `cancel_at_period_end`.
 *
 * `true` schedules cancellation for the end of the current billing period;
 * `false` reverses a pending one. Use {@link membershipCancel} instead to
 * revoke access immediately.
 */
interface Input {
  membershipId: string;
  cancelAtPeriodEnd?: boolean;
  metadata?: unknown;
}

const membershipUpdate: ActionDefinition<Input> = {
  key: "membership-update",
  type: "perform",
  resource: "membership",
  title: "Update Membership",
  description: "Merge metadata key-value pairs into a membership, or toggle its scheduled " +
    "cancel-at-period-end.",
  idempotent: true,
  params: [
    membershipIdParam,
    {
      key: "cancelAtPeriodEnd",
      label: "Cancel at period end",
      type: "boolean",
      hint: "true schedules cancellation for the end of the billing period; false reverses a " +
        "pending one. Leave empty to only update metadata.",
    },
    {
      key: "metadata",
      label: "Metadata",
      type: "json",
      hint: "Key-value pairs to merge into the membership's metadata. Pass {} to clear it.",
    },
  ],
  output: [{ key: "data", type: "object", label: "The updated membership" }],

  execute(input, ctx) {
    return new WhopClient(ctx).patch(`/memberships/${encodeURIComponent(input.membershipId)}`, {
      cancel_at_period_end: input.cancelAtPeriodEnd,
      metadata: asOptionalJson(input.metadata, "metadata"),
    });
  },
};

export default membershipUpdate;
