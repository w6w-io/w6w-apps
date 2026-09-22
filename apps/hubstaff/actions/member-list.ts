import type { ActionDefinition } from "@w6w/types";
import { HubstaffClient } from "../lib/client.ts";
import { csvParam, organizationIdParam, paginationParams } from "../lib/params.ts";

/**
 * `GET /v2/organizations/{organization_id}/members` — the organization's
 * memberships.
 *
 * Returns `{"members": [{...OrganizationMember}]}` plus the cursor envelope.
 * A row is a **membership**, not a user: it carries `user_id`, `pay_rate`,
 * `bill_rate`, `currency`, `membership_role`, `membership_status`,
 * `effective_role`, `trackable`, `removed_at`, `view_only` and `metadata`,
 * with the full `User` nested only when `include=users` asks for it.
 *
 * ## `search[email]` / `search[name]` are bracketed, and go on the wire as-is
 *
 * Hubstaff spells its nested filters with literal square brackets
 * (`search[email]`, `created_at[start]`, `time_slot[stop]`). They are ordinary
 * query keys — `?search%5Bemail%5D=…` after URL encoding — not a nested object.
 *
 * ## Removed members are invisible by default
 *
 * `include_removed` defaults to `false`, and a removed member's `removed_at` is
 * the only place that fact lives. A workflow that reconciles "everyone who
 * worked on this project" against this list will miss them.
 *
 * Requires an owner or organization manager role.
 */
interface Input {
  organization_id: number;
  search_email?: string;
  search_name?: string;
  membership_roles?: string;
  user_ids?: string;
  include_removed?: boolean;
  include_profile?: boolean;
  include_projects?: boolean;
  include?: string;
  page_start_id?: number;
  page_limit?: number;
}

const action: ActionDefinition<Input> = {
  key: "member-list",
  type: "read",
  resource: "member",
  title: "List Members",
  description:
    "List an organization's memberships (GET /v2/organizations/{organization_id}/members).",
  params: [
    organizationIdParam,
    {
      key: "search_email",
      label: "Search by email",
      type: "string",
      hint: "Sent as `search[email]`.",
      advanced: true,
    },
    {
      key: "search_name",
      label: "Search by name",
      type: "string",
      hint: "Sent as `search[name]`.",
      advanced: true,
    },
    csvParam(
      "membership_roles",
      "Membership roles",
      "Filter by role.",
      ["owner", "manager", "user", "unassigned"],
    ),
    csvParam("user_ids", "User IDs", "Return only these members.", []),
    {
      key: "include_removed",
      label: "Include removed members",
      type: "boolean",
      hint: "Off by default — a member removed from the organization is absent unless asked for.",
      advanced: true,
    },
    {
      key: "include_profile",
      label: "Include profile",
      type: "boolean",
      hint: "Side-load `profile`, the organization's custom member fields.",
      advanced: true,
    },
    {
      key: "include_projects",
      label: "Include projects",
      type: "boolean",
      hint: "Side-load `project_members`.",
      advanced: true,
    },
    csvParam("include", "Include", "Related data to side-load.", ["users", "projects"]),
    ...paginationParams(),
  ],
  output: [
    { key: "members", type: "array", label: "Memberships" },
    { key: "pagination", type: "object", label: "Cursor (next_page_start_id)" },
  ],

  execute(input, ctx) {
    return new HubstaffClient(ctx).request(`/organizations/${input.organization_id}/members`, {
      query: {
        "search[email]": input.search_email,
        "search[name]": input.search_name,
        membership_roles: input.membership_roles,
        user_ids: input.user_ids,
        include_removed: input.include_removed,
        include_profile: input.include_profile,
        include_projects: input.include_projects,
        include: input.include,
        page_start_id: input.page_start_id,
        page_limit: input.page_limit,
      },
    });
  },
};

export default action;
