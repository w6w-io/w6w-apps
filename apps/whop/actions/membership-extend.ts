import type { ActionDefinition } from "@w6w/types";
import { idempotencyHeaders, WhopClient } from "../lib/client.ts";
import { membershipIdParam } from "../lib/params.ts";

/**
 * `POST /memberships/{id}/extend` — add free days.
 *
 * Extends the current billing period, expiration date, or trial, depending on
 * the plan type. `days` adds work each call by nature, but this endpoint
 * documents `Idempotency-Key` support, which is what makes marking it
 * `idempotent: true` honest: a retry of the *same* runtime step replays the
 * original extension instead of adding the days twice.
 */
interface Input {
  membershipId: string;
  days: number;
}

const membershipExtend: ActionDefinition<Input> = {
  key: "membership-extend",
  type: "perform",
  resource: "membership",
  title: "Extend Membership",
  description: "Add free days to a membership, extending its period, expiration, or trial.",
  idempotent: true,
  params: [
    membershipIdParam,
    {
      key: "days",
      label: "Free days",
      type: "number",
      required: true,
      validation: { integer: true, min: 1, max: 1095 },
    },
  ],
  output: [{ key: "data", type: "object", label: "The extended membership" }],

  execute(input, ctx) {
    return new WhopClient(ctx).post(
      `/memberships/${encodeURIComponent(input.membershipId)}/extend`,
      { days: input.days },
      idempotencyHeaders(ctx)["Idempotency-Key"],
    );
  },
};

export default membershipExtend;
