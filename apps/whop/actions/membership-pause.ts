import type { ActionDefinition } from "@w6w/types";
import { idempotencyHeaders, WhopClient } from "../lib/client.ts";
import { membershipIdParam } from "../lib/params.ts";

/**
 * `POST /memberships/{id}/pause` — pause recurring payment collection.
 *
 * The customer keeps access but is not charged until resumed. `until`
 * schedules an automatic resume and only applies to memberships billed by
 * Whop itself — passing it for anything else is a documented `400`.
 */
interface Input {
  membershipId: string;
  until?: string;
}

const membershipPause: ActionDefinition<Input> = {
  key: "membership-pause",
  type: "perform",
  resource: "membership",
  title: "Pause Membership",
  description: "Pause a membership's recurring payment collection while keeping access.",
  idempotent: true,
  params: [
    membershipIdParam,
    {
      key: "until",
      label: "Resume at",
      type: "datetime",
      hint: "ISO 8601 time to automatically resume payment collection. Must be in the future; " +
        "only supported for memberships billed by Whop itself.",
    },
  ],
  output: [{ key: "data", type: "object", label: "The paused membership" }],

  execute(input, ctx) {
    return new WhopClient(ctx).post(
      `/memberships/${encodeURIComponent(input.membershipId)}/pause`,
      { until: input.until },
      idempotencyHeaders(ctx)["Idempotency-Key"],
    );
  },
};

export default membershipPause;
