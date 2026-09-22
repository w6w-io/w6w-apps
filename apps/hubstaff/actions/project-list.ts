import type { ActionDefinition } from "@w6w/types";
import { HubstaffClient } from "../lib/client.ts";
import { csvParam, organizationIdParam, paginationParams } from "../lib/params.ts";

/**
 * `GET /v2/organizations/{organization_id}/projects` — the organization's
 * projects.
 *
 * Returns `{"projects": [{...Project}]}` plus the cursor envelope. Each project
 * has `id`, `name`, `description`, `status`, `type` (`project`, `work_order` or
 * `work_break`), `client_id`, `billable`, `budget`, `pay_rate`, `bill_rate` and
 * `metadata`.
 *
 * ## `status` defaults to `active`, and that is the vendor's default
 *
 * The document declares `status` with `default: "active"` and the enum
 * `active` / `archived` / `all`. So an archived project is **not** in the
 * default page, and a workflow that "lists projects" and then filters locally
 * will silently miss everything archived. The prefill here matches the vendor's
 * own default rather than changing it.
 *
 * `include=clients` side-loads the related `Client` objects; `project_ids`
 * narrows the read to specific projects.
 */
interface Input {
  organization_id: number;
  status?: string;
  project_ids?: string;
  include?: string;
  page_start_id?: number;
  page_limit?: number;
}

const action: ActionDefinition<Input> = {
  key: "project-list",
  type: "read",
  resource: "project",
  title: "List Projects",
  description:
    "List an organization's projects (GET /v2/organizations/{organization_id}/projects).",
  params: [
    organizationIdParam,
    {
      key: "status",
      label: "Status",
      type: "select",
      default: "active",
      hint: "Projects to return. Hubstaff's own default is `active`, so archived projects are " +
        "absent unless asked for.",
      options: [
        { value: "active", label: "Active" },
        { value: "archived", label: "Archived" },
        { value: "all", label: "All" },
      ],
    },
    csvParam("project_ids", "Project IDs", "Return only these projects.", []),
    csvParam("include", "Include", "Related data to side-load.", ["clients"]),
    ...paginationParams(),
  ],
  output: [
    { key: "projects", type: "array", label: "Projects" },
    { key: "pagination", type: "object", label: "Cursor (next_page_start_id)" },
  ],

  execute(input, ctx) {
    return new HubstaffClient(ctx).request(`/organizations/${input.organization_id}/projects`, {
      query: {
        status: input.status,
        project_ids: input.project_ids,
        include: input.include,
        page_start_id: input.page_start_id,
        page_limit: input.page_limit,
      },
    });
  },
};

export default action;
