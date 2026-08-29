import type { ActionDefinition } from "@w6w/types";
import { idempotencyHeaders, WhopClient } from "../lib/client.ts";
import { membershipIdParam } from "../lib/params.ts";

/**
 * `POST /memberships/{id}/resume` — resume a previously paused membership.
 * Billing resumes on the next cycle.
 */
interface Input {
  membershipId: string;
}

const membershipResume: ActionDefinition<Input> = {
  key: "membership-resume",
  type: "perform",
  resource: "membership",
  title: "Resume Membership",
  description: "Resume a previously paused membership's recurring payment collection.",
  idempotent: true,
  params: [membershipIdParam],
  output: [{ key: "data", type: "object", label: "The resumed membership" }],

  execute(input, ctx) {
    return new WhopClient(ctx).post(
      `/memberships/${encodeURIComponent(input.membershipId)}/resume`,
      undefined,
      idempotencyHeaders(ctx)["Idempotency-Key"],
    );
  },
};

export default membershipResume;
