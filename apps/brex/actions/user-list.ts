import type { ActionDefinition } from "@w6w/types";
import { BrexClient, type BrexUser, toList } from "../lib/client.ts";
import { loadCustomFieldsParam, paginationParams, userStatusFilterOptions } from "../lib/params.ts";

/**
 * `GET /v2/users` — the account's users, filtered.
 *
 * This is the endpoint the rest of the app hangs off: every other write here
 * needs a `department_id`, `location_id`, `title_id` or `legal_entity_id`, and
 * this is where those ids come from.
 *
 * ## Two families of filters, and they do not mix
 *
 * Brex's own description of this endpoint:
 *
 *  - The plural filters (`email[]`, `status[]`, `manager_id[]`, …) take "either a
 *    comma-separated list or a repeated parameter", OR within one filter and AND
 *    across filters. This app sends one comma-separated value per filter, which
 *    Brex documents as equivalent — see `queryString()`. The bracket in the wire
 *    name is part of the name (`?status[]=ACTIVE,INVITED`), and this app keeps it
 *    rather than rewriting it as `status`.
 *  - The **legacy singular `email` and `remote_display_id`** "perform an exact
 *    lookup that returns at most one user, and cannot be combined with the
 *    filters above." Both are exposed, and both say so in their hints, because
 *    the failure is silent: combining them with `status[]` does not error, it
 *    just does not answer the question the caller asked.
 *
 * `name` is different again — a fuzzy, case-insensitive match against first
 * name, last name AND email.
 *
 * Deleted and archived users are excluded by default; `status[]` with
 * `ARCHIVED` is how a caller asks for them.
 */
interface Input {
  limit?: number;
  cursor?: string;
  name?: string;
  email?: string;
  remoteDisplayId?: string;
  emails?: string;
  statuses?: string[];
  managerIds?: string;
  departmentIds?: string;
  locationIds?: string;
  titleIds?: string;
  costCenterIds?: string;
  legalEntityIds?: string;
  customFields?: string;
  loadCustomFields?: boolean;
}

const userList: ActionDefinition<Input> = {
  key: "user-list",
  type: "search",
  resource: "user",
  title: "List Users",
  description:
    "List the account's Brex users, filtered by status, department, location, title, cost centre, " +
    "legal entity, manager, email, custom field or a fuzzy name match.",
  params: [
    {
      key: "name",
      label: "Name",
      type: "string",
      hint: "Fuzzy, case-insensitive match against first name, last name and email.",
    },
    {
      key: "email",
      label: "Email (exact lookup)",
      type: "string",
      hint:
        "Brex's legacy singular filter: an exact lookup that returns at most one user. It cannot " +
        "be combined with the other filters — use Emails below when you need them together.",
    },
    {
      key: "remoteDisplayId",
      label: "Remote display id (exact lookup)",
      type: "string",
      hint:
        "Brex's `remote_display_id` — the identifier an IDP or HR system shows, e.g. your Okta " +
        "username. Also a legacy exact lookup that cannot be combined with the filters below.",
    },
    {
      key: "emails",
      label: "Emails",
      type: "string",
      advanced: true,
      hint: "Comma-separated. Sent as `email[]`. Values are OR-ed.",
    },
    {
      key: "statuses",
      label: "Statuses",
      type: "multiselect",
      options: userStatusFilterOptions,
      advanced: true,
      hint: "Sent as `status[]`. Archived users are excluded unless ARCHIVED is selected.",
    },
    {
      key: "managerIds",
      label: "Manager ids",
      type: "string",
      advanced: true,
      hint: "Comma-separated user ids. Sent as `manager_id[]`.",
    },
    {
      key: "departmentIds",
      label: "Department ids",
      type: "string",
      advanced: true,
      hint: "Comma-separated. Sent as `department_id[]`.",
    },
    {
      key: "locationIds",
      label: "Location ids",
      type: "string",
      advanced: true,
      hint: "Comma-separated. Sent as `location_id[]`.",
    },
    {
      key: "titleIds",
      label: "Title ids",
      type: "string",
      advanced: true,
      hint: "Comma-separated. Sent as `title_id[]`.",
    },
    {
      key: "costCenterIds",
      label: "Cost centre ids",
      type: "string",
      advanced: true,
      hint: "Comma-separated. Sent as `cost_center_id[]`.",
    },
    {
      key: "legalEntityIds",
      label: "Legal entity ids",
      type: "string",
      advanced: true,
      hint: "Comma-separated. Sent as `legal_entity_id[]`.",
    },
    {
      key: "customFields",
      label: "Custom fields",
      type: "string",
      advanced: true,
      hint:
        "Comma-separated `key:option_id` pairs, sent as `custom_field[]`. Values within one key " +
        "are OR-ed and separate keys are AND-ed together.",
    },
    loadCustomFieldsParam,
    ...paginationParams(),
  ],
  output: [
    { key: "items", type: "array", label: "Users" },
    { key: "next_cursor", type: "string", label: "Cursor for the next page, or null at the end" },
    { key: "count", type: "number", label: "Users in this page" },
  ],

  execute(input, ctx) {
    return new BrexClient(ctx).list<BrexUser>("/users", {
      query: {
        name: input.name,
        email: input.email,
        remote_display_id: input.remoteDisplayId,
        "email[]": toList(input.emails),
        "status[]": toList(input.statuses),
        "manager_id[]": toList(input.managerIds),
        "department_id[]": toList(input.departmentIds),
        "location_id[]": toList(input.locationIds),
        "title_id[]": toList(input.titleIds),
        "cost_center_id[]": toList(input.costCenterIds),
        "legal_entity_id[]": toList(input.legalEntityIds),
        "custom_field[]": toList(input.customFields),
        load_custom_fields: input.loadCustomFields,
        cursor: input.cursor,
        limit: input.limit,
      },
    });
  },
};

export default userList;
