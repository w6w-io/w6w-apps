import type { ActionDefinition } from "@w6w/types";
import { OnceHubClient } from "../lib/client.ts";

interface Input {
  user?: string;
  before?: string;
  after?: string;
  limit?: number;
}

/** GET /teams — cursor-paginated. */
const teamList: ActionDefinition<Input> = {
  key: "team-list",
  type: "read",
  resource: "team",
  title: "List Teams",
  description: "List all teams in the account (GET /teams).",
  output: [
    { key: "object", type: "string", label: "Object type (list)" },
    { key: "data", type: "array", label: "Teams" },
    { key: "has_more", type: "boolean", label: "More results available" },
  ],
  params: [
    {
      key: "user",
      label: "Member user ID",
      type: "string",
      hint: "Only teams this user belongs to.",
    },
    { key: "before", label: "Before cursor", type: "string", advanced: true },
    { key: "after", label: "After cursor", type: "string", advanced: true },
    { key: "limit", label: "Limit", type: "number", default: 10, advanced: true, hint: "1-100." },
  ],

  execute(input, ctx) {
    return new OnceHubClient(ctx).request("/teams", {
      query: { user: input.user, before: input.before, after: input.after, limit: input.limit },
    });
  },
};

export default teamList;
