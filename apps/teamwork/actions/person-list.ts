import type { ActionDefinition } from "@w6w/types";
import { csvIds, TeamworkClient, unset } from "../lib/client.ts";
import { pagination } from "../lib/params.ts";

interface Input {
  searchTerm?: string;
  projectIds?: string;
  page?: number;
  pageSize?: number;
}

const personList: ActionDefinition<Input> = {
  key: "person-list",
  type: "search",
  resource: "person",
  title: "List People",
  description: "List the people (users) in the account, or on a given project.",
  params: [
    { key: "searchTerm", label: "Search", type: "string" },
    {
      key: "projectIds",
      label: "Project IDs",
      type: "string",
      hint: "Comma-separated. Limits to people on these projects.",
    },
    ...pagination,
  ],
  output: [
    { key: "people", type: "array", label: "People" },
    { key: "meta", type: "object", label: "Pagination metadata" },
  ],

  execute(input, ctx) {
    return new TeamworkClient(ctx).request("/projects/api/v3/people.json", {
      query: {
        searchTerm: unset(input.searchTerm),
        projectIds: csvIds(input.projectIds),
        page: input.page,
        pageSize: input.pageSize,
      },
    });
  },
};

export default personList;
