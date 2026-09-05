import type { ActionDefinition } from "@w6w/types";
import { compact, SignRequestClient } from "../lib/client.ts";
import { limitParam, pageParam } from "../lib/params.ts";

interface Input {
  isActive?: boolean;
  userEmail?: string;
  page?: number;
  limit?: number;
}

/** `GET /team-members/` — list the current team's members. */
const teamMemberList: ActionDefinition<Input> = {
  key: "team-member-list",
  type: "read",
  resource: "team",
  title: "List Team Members",
  description: "List the current team's members.",
  params: [
    { key: "isActive", label: "Active only", type: "boolean" },
    { key: "userEmail", label: "User Email", type: "string" },
    pageParam,
    limitParam,
  ],
  output: [
    { key: "count", type: "number", label: "Total result count" },
    { key: "next", type: "string", label: "Next page URL" },
    { key: "previous", type: "string", label: "Previous page URL" },
    { key: "results", type: "array", label: "Team members" },
  ],

  execute(input, ctx) {
    return new SignRequestClient(ctx).request("/team-members/", {
      query: compact({
        is_active: input.isActive,
        "user__email": input.userEmail,
        page: input.page,
        limit: input.limit,
      }),
    });
  },
};

export default teamMemberList;
