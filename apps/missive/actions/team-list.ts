import type { ActionDefinition } from "@w6w/types";
import { compact, MissiveClient } from "../lib/client.ts";

interface Input {
  organization?: string;
  limit?: number;
  offset?: number;
}

/**
 * `GET /v1/teams` — verified against
 * `missiveapp.com/docs/developers/rest-api/endpoints` §Teams, 2026-08-29.
 */
const action: ActionDefinition<Input> = {
  key: "team-list",
  type: "read",
  resource: "team",
  title: "List Teams",
  description: "List teams in organizations the authenticated user has access to.",
  params: [
    { key: "organization", label: "Organization ID", type: "string", default: "" },
    { key: "limit", label: "Limit", type: "number", default: 50, hint: "Max: 200." },
    { key: "offset", label: "Offset", type: "number", default: 0, advanced: true },
  ],
  output: [
    { key: "teams", type: "array", label: "Teams" },
  ],

  async execute(input, ctx) {
    const res = await new MissiveClient(ctx).json<{ teams: unknown[] }>("/teams", {
      query: compact({
        organization: input.organization,
        limit: input.limit,
        offset: input.offset,
      }),
    });
    return res.teams;
  },
};

export default action;
