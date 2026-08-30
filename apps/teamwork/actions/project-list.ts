import type { ActionDefinition } from "@w6w/types";
import { TeamworkClient, unset } from "../lib/client.ts";
import { pagination } from "../lib/params.ts";

interface Input {
  searchTerm?: string;
  updatedAfter?: string;
  onlyStarredProjects?: boolean;
  includeArchivedProjects?: boolean;
  orderBy?: string;
  orderMode?: string;
  page?: number;
  pageSize?: number;
}

const projectList: ActionDefinition<Input> = {
  key: "project-list",
  type: "search",
  resource: "project",
  title: "List Projects",
  description: "List projects the connected user can access. Use the filters to narrow the set.",
  params: [
    { key: "searchTerm", label: "Search", type: "string", hint: "Filter by project name." },
    {
      key: "updatedAfter",
      label: "Updated after",
      type: "datetime",
      hint: "Only projects updated on or after this time.",
    },
    { key: "onlyStarredProjects", label: "Starred only", type: "boolean", row: "filter" },
    {
      key: "includeArchivedProjects",
      label: "Include archived",
      type: "boolean",
      row: "filter",
    },
    {
      key: "orderBy",
      label: "Sort by",
      type: "select",
      default: "name",
      row: "sort",
      options: [
        { value: "name", label: "Name" },
        { value: "datecreated", label: "Created" },
        { value: "duedate", label: "Due date" },
        { value: "lastactivity", label: "Last activity" },
      ],
    },
    {
      key: "orderMode",
      label: "Order",
      type: "select",
      default: "asc",
      row: "sort",
      options: [
        { value: "asc", label: "Ascending" },
        { value: "desc", label: "Descending" },
      ],
    },
    ...pagination,
  ],
  output: [
    { key: "projects", type: "array", label: "Projects" },
    { key: "meta", type: "object", label: "Pagination metadata" },
  ],

  execute(input, ctx) {
    return new TeamworkClient(ctx).request("/projects/api/v3/projects.json", {
      query: {
        searchTerm: unset(input.searchTerm),
        updatedAfter: unset(input.updatedAfter),
        onlyStarredProjects: input.onlyStarredProjects,
        includeArchivedProjects: input.includeArchivedProjects,
        orderBy: unset(input.orderBy),
        orderMode: unset(input.orderMode),
        page: input.page,
        pageSize: input.pageSize,
      },
    });
  },
};

export default projectList;
