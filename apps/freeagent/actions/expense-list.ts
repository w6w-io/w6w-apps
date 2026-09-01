import type { ActionDefinition } from "@w6w/types";
import { FreeAgentClient, ref } from "../lib/client.ts";
import { fromDate, page, perPage, toDate, updatedSince } from "../lib/params.ts";

interface Input {
  view?: "all" | "recent";
  projectId?: string;
  fromDate?: string;
  toDate?: string;
  updatedSince?: string;
  page?: number;
  perPage?: number;
}

const expenseList: ActionDefinition<Input> = {
  key: "expense-list",
  type: "read",
  resource: "expense",
  title: "List Expenses",
  description: "List expenses, optionally scoped to a project or date range.",
  params: [
    {
      key: "view",
      label: "View",
      type: "select",
      advanced: true,
      options: [
        { value: "all", label: "All (default)" },
        { value: "recent", label: "Recent" },
      ],
    },
    { key: "projectId", label: "Project ID", type: "string", advanced: true },
    fromDate,
    toDate,
    updatedSince,
    page,
    perPage,
  ],
  output: [{ key: "expenses", type: "array", label: "Expenses" }],

  execute(input, ctx) {
    return new FreeAgentClient(ctx).request("/expenses", {
      query: {
        view: input.view,
        project: input.projectId ? ref("projects", input.projectId) : undefined,
        from_date: input.fromDate,
        to_date: input.toDate,
        updated_since: input.updatedSince,
        page: input.page,
        per_page: input.perPage,
      },
    });
  },
};

export default expenseList;
