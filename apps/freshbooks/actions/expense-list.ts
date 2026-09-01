import type { ActionDefinition } from "@w6w/types";
import { FreshBooksClient, jsonObject } from "../lib/client.ts";
import { page, perPage, searchFilters } from "../lib/params.ts";

interface Input {
  page?: number;
  perPage?: number;
  search?: unknown;
}

const expenseList: ActionDefinition<Input> = {
  key: "expense-list",
  type: "read",
  resource: "expense",
  title: "List Expenses",
  description: "List expenses.",
  params: [page, perPage, searchFilters],
  output: [{ key: "expenses", type: "array", label: "Expenses" }],

  execute(input, ctx) {
    return new FreshBooksClient(ctx).request("accounting", "/expenses/expenses", {
      query: { page: input.page ?? 1, per_page: input.perPage },
      search: jsonObject(input.search, "search"),
    });
  },
};

export default expenseList;
