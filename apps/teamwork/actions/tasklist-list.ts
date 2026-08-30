import type { ActionDefinition } from "@w6w/types";
import { csvIds, TeamworkClient, unset } from "../lib/client.ts";
import { pagination } from "../lib/params.ts";

interface Input {
  searchTerm?: string;
  projectIds?: string;
  showCompleted?: boolean;
  page?: number;
  pageSize?: number;
}

const tasklistList: ActionDefinition<Input> = {
  key: "tasklist-list",
  type: "search",
  resource: "tasklist",
  title: "List Task Lists",
  description: "List task lists across projects. Use the filters to narrow the set.",
  // Confirmed against apidocs.teamwork.com: this V3 endpoint's own documented
  // path carries no `.json` suffix, unlike every other V3 list endpoint in
  // this app — verified on its docs page title, not assumed.
  params: [
    { key: "searchTerm", label: "Search", type: "string" },
    {
      key: "projectIds",
      label: "Project IDs",
      type: "string",
      hint: "Comma-separated.",
    },
    { key: "showCompleted", label: "Include completed", type: "boolean" },
    ...pagination,
  ],
  output: [
    { key: "tasklists", type: "array", label: "Task lists" },
    { key: "meta", type: "object", label: "Pagination metadata" },
  ],

  execute(input, ctx) {
    return new TeamworkClient(ctx).request("/projects/api/v3/tasklists", {
      query: {
        searchTerm: unset(input.searchTerm),
        projectIds: csvIds(input.projectIds),
        showCompleted: input.showCompleted,
        page: input.page,
        pageSize: input.pageSize,
      },
    });
  },
};

export default tasklistList;
