import type { ActionDefinition } from "@w6w/types";
import { DatadogClient } from "../lib/client.ts";
import { sortDirectionOptions } from "../lib/params.ts";

/**
 * `GET /api/v2/users` — users in the organization.
 *
 * **The list includes deactivated and unverified users**, in Datadog's own
 * words. So a count from here is not a headcount and not a licence count; filter
 * on `filter[status]` (`Active`, `Pending`, `Disabled`) if that is what you
 * meant.
 *
 * `sort` is a field name with an optional leading `-` for descending — and there
 * is *also* a separate `sort_dir`. Datadog accepts both; the `-` prefix is the
 * one its own examples use.
 *
 * Paging here is `page[number]` / `page[size]`, offset-style, with a maximum
 * page size of 100 — not the cursor the v2 events and logs endpoints use, and
 * not the `page[offset]` the v2 downtimes endpoint uses. Three v2 pagination
 * styles in one API.
 *
 * Needs the application key and the `user_access_read` scope. This action reads
 * profiles only; the endpoints that return key material
 * (`/api/v2/current_user/application_keys`, `/api/v1/api_key`,
 * `/api/v1/application_key`) are deliberately absent from this app.
 */
interface Input {
  filter?: string;
  status?: string;
  sort?: string;
  sortDir?: string;
  pageNumber?: number;
  pageSize?: number;
}

const userList: ActionDefinition<Input> = {
  key: "user-list",
  type: "search",
  resource: "user",
  title: "List Users",
  description: "List users in the organization, including deactivated and unverified ones.",
  params: [
    {
      key: "filter",
      label: "Filter",
      type: "string",
      hint: "Free-text match across users. Datadog's default is no filtering.",
    },
    {
      key: "status",
      label: "Status",
      type: "string",
      placeholder: "Active",
      hint: "Comma-separated, from `Active`, `Pending`, `Disabled`. Without it the list includes " +
        "deactivated and unverified users.",
    },
    {
      key: "sort",
      label: "Sort by",
      type: "string",
      advanced: true,
      placeholder: "name",
      hint: "A user attribute. Prefix with `-` for descending — Datadog's own convention.",
    },
    {
      key: "sortDir",
      label: "Sort direction",
      type: "select",
      advanced: true,
      options: sortDirectionOptions,
    },
    {
      key: "pageNumber",
      label: "Page",
      type: "number",
      advanced: true,
      validation: { integer: true, min: 0 },
      hint: "Zero-based. Datadog's own default is 0.",
    },
    {
      key: "pageSize",
      label: "Page size",
      type: "number",
      default: 10,
      validation: { integer: true, min: 1, max: 100 },
      hint: "Datadog's own default is 10; the maximum is 100.",
    },
  ],
  output: [
    { key: "data", type: "array", label: "Users" },
    { key: "included", type: "array", label: "Related orgs and roles" },
    { key: "meta", type: "object", label: "Paging metadata" },
  ],

  execute(input, ctx) {
    return new DatadogClient(ctx).json("/api/v2/users", {
      query: {
        filter: input.filter,
        "filter[status]": input.status,
        sort: input.sort,
        sort_dir: input.sortDir,
        "page[number]": input.pageNumber,
        "page[size]": input.pageSize,
      },
    });
  },
};

export default userList;
