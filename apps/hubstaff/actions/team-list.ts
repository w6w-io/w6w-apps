import type { ActionDefinition } from "@w6w/types";
import { HubstaffClient } from "../lib/client.ts";
import { organizationIdParam, paginationParams } from "../lib/params.ts";

/**
 * `GET /v2/organizations/{organization_id}/teams` — the organization's teams.
 *
 * Returns `{"teams": [{...Team}]}` plus the cursor envelope. `Team` is thin:
 * `id`, `name`, `created_at`, `updated_at`, `metadata` and `lead_options`. The
 * memberships and the projects are separate sub-resources
 * (`/v2/teams/{team_id}/members`, `/v2/teams/{team_id}/projects`) that this
 * build does not cover.
 */
interface Input {
  organization_id: number;
  page_start_id?: number;
  page_limit?: number;
}

const action: ActionDefinition<Input> = {
  key: "team-list",
  type: "read",
  resource: "team",
  title: "List Teams",
  description: "List an organization's teams (GET /v2/organizations/{organization_id}/teams).",
  params: [organizationIdParam, ...paginationParams()],
  output: [
    { key: "teams", type: "array", label: "Teams" },
    { key: "pagination", type: "object", label: "Cursor (next_page_start_id)" },
  ],

  execute(input, ctx) {
    return new HubstaffClient(ctx).request(`/organizations/${input.organization_id}/teams`, {
      query: {
        page_start_id: input.page_start_id,
        page_limit: input.page_limit,
      },
    });
  },
};

export default action;
