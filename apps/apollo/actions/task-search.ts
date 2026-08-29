import type { ActionDefinition } from "@w6w/types";
import { ApolloClient, type ApolloPagination, compact } from "../lib/client.ts";
import { paginationParams } from "../lib/params.ts";

/** `POST /tasks/search` — search/list tasks. Query parameters, not a JSON body. */
interface Input {
  sort_by_field?: string;
  open_factor_names?: string[] | string;
  page?: number;
  per_page?: number;
}

function toArr(v: string[] | string | undefined): string[] | undefined {
  if (v === undefined) return undefined;
  return Array.isArray(v) ? v : v.split(",").map((s) => s.trim()).filter(Boolean);
}

const taskSearch: ActionDefinition<Input> = {
  key: "task-search",
  type: "search",
  resource: "task",
  title: "Search Tasks",
  description: "Search or list your team's tasks.",
  params: [
    { key: "sort_by_field", label: "Sort by", type: "string", advanced: true },
    {
      key: "open_factor_names",
      label: "Open factors",
      type: "string",
      advanced: true,
      hint: "Comma-separated. Apollo's own task-completion facets.",
    },
    ...paginationParams(25),
  ],
  output: [
    { key: "tasks", type: "array", label: "Matching tasks" },
    { key: "pagination", type: "object", label: "page, per_page, total_entries, total_pages" },
  ],

  async execute(input, ctx) {
    const body = await new ApolloClient(ctx).post<
      { tasks?: unknown[]; pagination?: ApolloPagination }
    >("/tasks/search", {
      query: compact({
        sort_by_field: input.sort_by_field,
        open_factor_names: toArr(input.open_factor_names),
        page: input.page,
        per_page: input.per_page,
      }),
    });
    return { tasks: body.tasks ?? [], pagination: body.pagination ?? {} };
  },
};

export default taskSearch;
