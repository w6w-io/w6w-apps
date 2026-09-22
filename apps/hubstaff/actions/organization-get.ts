import type { ActionDefinition } from "@w6w/types";
import { HubstaffClient } from "../lib/client.ts";
import { organizationIdParam } from "../lib/params.ts";

/**
 * `GET /v2/organizations/{organization_id}` — one organization.
 *
 * Returns `{"organization": {...}}`, the same `Organization` schema the list
 * uses: `id`, `name`, `status`, `created_at`, `updated_at`,
 * `member_profile_fields`, `metadata` and `invite_url`.
 */
interface Input {
  organization_id: number;
}

const action: ActionDefinition<Input> = {
  key: "organization-get",
  type: "read",
  resource: "organization",
  title: "Get Organization",
  description: "Get one organization by ID (GET /v2/organizations/{organization_id}).",
  params: [organizationIdParam],
  output: [{ key: "organization", type: "object", label: "Organization" }],

  execute(input, ctx) {
    return new HubstaffClient(ctx).request(`/organizations/${input.organization_id}`);
  },
};

export default action;
