import type { ActionDefinition } from "@w6w/types";
import { CompanyCamClient, type ListPage } from "../lib/client.ts";
import { listOutput, pageParams, paginationQuery } from "../lib/params.ts";

/**
 * `GET /v2/checklists` — every checklist in the company, newest-updated first.
 *
 * The `completed` filter is a boolean, and leaving it off returns both states.
 * This is the company-wide view; `project-checklist-list` is the per-project
 * one, and unlike this endpoint it accepts no pagination.
 *
 * Rows are full checklists including sections and tasks, so a large page is a
 * large response — the prefilled 50 matters here more than elsewhere.
 */
interface Input {
  completed?: boolean;
  page?: number;
  perPage?: number;
}

const checklistList: ActionDefinition<Input, ListPage<Record<string, unknown>>> = {
  key: "checklist-list",
  type: "search",
  resource: "checklist",
  title: "List All Checklists",
  description: "List the company's checklists, sorted by last updated, optionally by completion.",
  params: [
    {
      key: "completed",
      label: "Completed",
      type: "boolean",
      hint: "Leave unset to return both completed and outstanding checklists.",
    },
    ...pageParams(),
  ],
  output: listOutput,

  execute(input, ctx) {
    return new CompanyCamClient(ctx).list("/checklists", {
      query: { ...paginationQuery(input), completed: input.completed },
    });
  },
};

export default checklistList;
