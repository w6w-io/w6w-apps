import type { ActionDefinition } from "@w6w/types";
import { csvIds, TeamworkClient, unset } from "../lib/client.ts";
import { pagination } from "../lib/params.ts";

interface Input {
  searchTerm?: string;
  projectIds?: string;
  dueBefore?: string;
  dueAfter?: string;
  includeCompleted?: boolean;
  page?: number;
  pageSize?: number;
}

const milestoneList: ActionDefinition<Input> = {
  key: "milestone-list",
  type: "search",
  resource: "milestone",
  title: "List Milestones",
  description: "List milestones across projects. Use the filters to narrow the set.",
  params: [
    { key: "searchTerm", label: "Search", type: "string", hint: "Matches name and description." },
    {
      key: "projectIds",
      label: "Project IDs",
      type: "string",
      hint: "Comma-separated.",
    },
    { key: "dueAfter", label: "Due after", type: "date", row: "due" },
    { key: "dueBefore", label: "Due before", type: "date", row: "due" },
    { key: "includeCompleted", label: "Include completed", type: "boolean" },
    ...pagination,
  ],
  output: [
    { key: "milestones", type: "array", label: "Milestones" },
    { key: "meta", type: "object", label: "Pagination metadata" },
  ],

  execute(input, ctx) {
    return new TeamworkClient(ctx).request("/projects/api/v3/milestones.json", {
      query: {
        searchTerm: unset(input.searchTerm),
        projectIds: csvIds(input.projectIds),
        dueAfter: unset(input.dueAfter),
        dueBefore: unset(input.dueBefore),
        includeCompleted: input.includeCompleted,
        page: input.page,
        pageSize: input.pageSize,
      },
    });
  },
};

export default milestoneList;
