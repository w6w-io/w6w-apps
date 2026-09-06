import type { ActionDefinition } from "@w6w/types";
import { PatreonClient } from "../lib/client.ts";

interface Input {
  /** The member UUID (`03ca69c3-...`) — NOT the user id. */
  memberId: string;
  include?: string;
  memberFields?: string;
  tierFields?: string;
  addressFields?: string;
}

const getMember: ActionDefinition<Input> = {
  key: "get-member",
  type: "read",
  resource: "member",
  title: "Get Member",
  description:
    "Fetch a single member by their member id (GET /members/{member_id}). Requires the " +
    "`campaigns.members` scope. Make sure to use the member UUID and not the user id — " +
    "they are different resources.",
  params: [
    { key: "memberId", label: "Member ID (UUID)", type: "string", required: true },
    {
      key: "include",
      label: "Include related resources",
      type: "string",
      hint: "CSV: address, campaign, currently_entitled_tiers, user",
      default: "currently_entitled_tiers",
    },
    { key: "memberFields", label: "Member fields", type: "string", hint: "CSV" },
    { key: "tierFields", label: "Tier fields", type: "string", hint: "CSV" },
    { key: "addressFields", label: "Address fields", type: "string", hint: "CSV" },
  ],
  output: [
    { key: "data.id", type: "string", label: "Member ID" },
    { key: "data.attributes", type: "object", label: "Member attributes" },
  ],

  execute(input, ctx) {
    return new PatreonClient(ctx).request(`/members/${encodeURIComponent(input.memberId)}`, {
      query: {
        include: input.include ?? "currently_entitled_tiers",
        "fields[member]": input.memberFields,
        "fields[tier]": input.tierFields,
        "fields[address]": input.addressFields,
      },
    });
  },
};

export default getMember;
