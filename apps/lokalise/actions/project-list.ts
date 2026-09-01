import type { ActionDefinition } from "@w6w/types";
import { boolFlag, LokaliseClient } from "../lib/client.ts";
import { paginationParams, paginationQuery } from "../lib/params.ts";

/**
 * `GET /projects` — projects the token can access.
 *
 * This is also the credential-liveness probe (`auth/api-token.ts`) — see there
 * for why. Supports both offset pagination (default, reports `totalCount`) and
 * cursor pagination (faster on many projects, reports `nextCursor` instead).
 */
interface Input {
  filterTeamId?: number;
  filterNames?: string;
  includeStatistics?: boolean;
  includeSettings?: boolean;
  limit?: number;
  page?: number;
  cursor?: string;
}

const projectList: ActionDefinition<Input> = {
  key: "project-list",
  type: "search",
  resource: "project",
  title: "List Projects",
  description: "List the projects this token can access.",
  params: [
    { key: "filterTeamId", label: "Team ID", type: "number", hint: "Limit results to one team." },
    {
      key: "filterNames",
      label: "Project names",
      type: "string",
      hint: "One or more project names to filter by (comma separated).",
    },
    { key: "includeStatistics", label: "Include statistics", type: "boolean" },
    { key: "includeSettings", label: "Include settings", type: "boolean" },
    ...paginationParams(100),
  ],
  output: [
    { key: "items", type: "array", label: "Projects" },
    {
      key: "totalCount",
      type: "number",
      label: "Total matching projects (offset pagination only)",
    },
    { key: "nextCursor", type: "string", label: "Cursor for the next page, when more remain" },
  ],

  async execute(input, ctx) {
    const { items, totalCount, nextCursor } = await new LokaliseClient(ctx).list(
      "/projects",
      "projects",
      {
        query: {
          filter_team_id: input.filterTeamId,
          filter_names: input.filterNames,
          include_statistics: boolFlag(input.includeStatistics),
          include_settings: boolFlag(input.includeSettings),
          ...paginationQuery(input),
        },
      },
    );
    return { items, totalCount, nextCursor };
  },
};

export default projectList;
