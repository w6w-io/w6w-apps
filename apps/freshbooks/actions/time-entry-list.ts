import type { ActionDefinition } from "@w6w/types";
import { FreshBooksClient, jsonObject } from "../lib/client.ts";
import { businessFilters, page, perPage } from "../lib/params.ts";

interface Input {
  page?: number;
  perPage?: number;
  filters?: unknown;
}

const timeEntryList: ActionDefinition<Input> = {
  key: "time-entry-list",
  type: "read",
  resource: "time-entry",
  title: "List Time Entries",
  description: "List logged time entries.",
  params: [page, perPage, businessFilters],
  output: [{ key: "time_entries", type: "array", label: "Time entries" }],

  execute(input, ctx) {
    return new FreshBooksClient(ctx).request("timetracking", "/time_entries", {
      query: {
        page: input.page ?? 1,
        per_page: input.perPage,
        ...jsonObject(input.filters, "filters"),
      },
    });
  },
};

export default timeEntryList;
