import type { ActionDefinition } from "@w6w/types";
import { CursorClient } from "../lib/client.ts";

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: string;
  isRemoved: boolean;
}

interface MembersResponse {
  teamMembers: TeamMember[];
}

/**
 * `GET /teams/members` — every current and former team member.
 *
 * This is also the connection's credential probe (`auth/basic.ts`): it needs
 * a credential, returns nothing secret, and is the doc's own canonical
 * example.
 */
const membersList: ActionDefinition<Record<string, never>> = {
  key: "members-list",
  type: "read",
  resource: "member",
  title: "List Team Members",
  description: "Retrieve all team members and their details.",
  params: [],
  output: [
    { key: "teamMembers", type: "array", label: "Team members" },
  ],

  async execute(_input, ctx) {
    const body = await new CursorClient(ctx).get<MembersResponse>("/teams/members");
    return { teamMembers: body.teamMembers ?? [] };
  },
};

export default membersList;
