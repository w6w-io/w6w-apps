import type { ActionDefinition } from "@w6w/types";
import { HubstaffClient } from "../lib/client.ts";
import { csvParam, organizationIdParam, paginationParams } from "../lib/params.ts";

/**
 * `GET /v2/organizations/{organization_id}/clients` — the organization's
 * clients.
 *
 * Returns `{"clients": [{...Client}]}` plus the cursor envelope: `id`,
 * `organization_id`, `name`, `emails`, `phone`, `address`, `project_ids`,
 * `invoice_notes`, `net_terms`, `status`, `budget`, `metadata`.
 *
 * `status` defaults to `active` exactly as `project-list`'s does, so archived
 * clients need `status=archived` or `status=all`. `include=projects`
 * side-loads the related projects.
 */
interface Input {
  organization_id: number;
  status?: string;
  include?: string;
  page_start_id?: number;
  page_limit?: number;
}

const action: ActionDefinition<Input> = {
  key: "client-list",
  type: "read",
  resource: "client",
  title: "List Clients",
  description: "List an organization's clients (GET /v2/organizations/{organization_id}/clients).",
  params: [
    organizationIdParam,
    {
      key: "status",
      label: "Status",
      type: "select",
      default: "active",
      hint: "Clients to return. Hubstaff's own default is `active`.",
      options: [
        { value: "active", label: "Active" },
        { value: "archived", label: "Archived" },
        { value: "all", label: "All" },
      ],
    },
    csvParam("include", "Include", "Related data to side-load.", ["projects"]),
    ...paginationParams(),
  ],
  output: [
    { key: "clients", type: "array", label: "Clients" },
    { key: "pagination", type: "object", label: "Cursor (next_page_start_id)" },
  ],

  execute(input, ctx) {
    return new HubstaffClient(ctx).request(`/organizations/${input.organization_id}/clients`, {
      query: {
        status: input.status,
        include: input.include,
        page_start_id: input.page_start_id,
        page_limit: input.page_limit,
      },
    });
  },
};

export default action;
