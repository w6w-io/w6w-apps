import type { ActionDefinition } from "@w6w/types";
import { CompanyCamClient, type ListPage } from "../lib/client.ts";
import { listOutput, pageParams, paginationQuery } from "../lib/params.ts";

/**
 * `GET /v2/projects` — the projects this credential can see.
 *
 * Two filters are worth reading twice:
 *
 *  - **`query` searches name and address line 1 only**, per the vendor's own
 *    description. It is not a full-text search over notes, tags or photos, so a
 *    workflow looking up "the Smith job" finds it only if that string is in the
 *    project's name or street address.
 *  - **`status` defaults to everything, including deleted projects.** The
 *    vendor is explicit: "When omitted, projects of all statuses are returned."
 *    A sync that does not set it will happily re-import projects the customer
 *    deleted, so the choice is exposed rather than hidden behind a default.
 *
 * `modified_since` is the incremental-sync hook and takes an **ISO 8601**
 * timestamp — the one place in this API that does not use a Unix integer.
 */
interface Input {
  query?: string;
  status?: string;
  modifiedSince?: string;
  page?: number;
  perPage?: number;
}

const projectList: ActionDefinition<Input, ListPage<Record<string, unknown>>> = {
  key: "project-list",
  type: "search",
  resource: "project",
  title: "List Projects",
  description: "List projects, optionally filtered by name/address, status or modification time.",
  params: [
    {
      key: "query",
      label: "Search",
      type: "string",
      hint: "Matches the project name and street address line 1 only.",
    },
    {
      key: "status",
      label: "Status",
      type: "select",
      options: [
        { value: "active", label: "Active only" },
        { value: "deleted", label: "Deleted only" },
      ],
      hint: "Leave empty to return projects of every status, including deleted ones — that is " +
        "the vendor's documented default.",
    },
    {
      key: "modifiedSince",
      label: "Modified since",
      type: "string",
      hint: "ISO 8601 date-time, e.g. 2026-08-01T00:00:00Z. Unlike every other timestamp in " +
        "this API, this one is not a Unix integer.",
    },
    ...pageParams(),
  ],
  output: listOutput,

  execute(input, ctx) {
    return new CompanyCamClient(ctx).list("/projects", {
      query: {
        ...paginationQuery(input),
        query: input.query,
        status: input.status,
        modified_since: input.modifiedSince,
      },
    });
  },
};

export default projectList;
