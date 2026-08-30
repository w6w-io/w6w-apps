import type { ActionDefinition } from "@w6w/types";
import { WhopClient } from "../lib/client.ts";

/**
 * `GET /members/{id}` — a member by ID. Accessible to the account and to the
 * member's own user.
 */
interface Input {
  memberId: string;
}

const memberGet: ActionDefinition<Input> = {
  key: "member-get",
  type: "read",
  resource: "member",
  title: "Get Member",
  description: "Retrieve one member (a buyer's relationship with an account) by ID.",
  params: [
    {
      key: "memberId",
      label: "Member",
      type: "string",
      required: true,
      placeholder: "mber_xxxxxxxxxxxxxx",
    },
  ],
  output: [{ key: "data", type: "object", label: "The member" }],

  execute(input, ctx) {
    return new WhopClient(ctx).get(`/members/${encodeURIComponent(input.memberId)}`);
  },
};

export default memberGet;
