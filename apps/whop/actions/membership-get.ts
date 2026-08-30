import type { ActionDefinition } from "@w6w/types";
import { WhopClient } from "../lib/client.ts";
import { membershipIdParam } from "../lib/params.ts";

/**
 * `GET /memberships/{id}` — one membership, by ID or software license key.
 * Accessible to the account and to the membership's own user.
 */
interface Input {
  membershipId: string;
}

const membershipGet: ActionDefinition<Input> = {
  key: "membership-get",
  type: "read",
  resource: "membership",
  title: "Get Membership",
  description: "Retrieve a membership by ID or by its software license key.",
  params: [membershipIdParam],
  output: [{ key: "data", type: "object", label: "The membership" }],

  execute(input, ctx) {
    return new WhopClient(ctx).get(`/memberships/${encodeURIComponent(input.membershipId)}`);
  },
};

export default membershipGet;
