import type { ActionDefinition } from "@w6w/types";
import { CursorClient } from "../lib/client.ts";
import { pageParams } from "../lib/params.ts";

interface Input {
  searchTerm?: string;
  sortBy?: string;
  sortDirection?: "asc" | "desc";
  page?: number;
  pageSize?: number;
}

/**
 * `POST /teams/spend` — per-member spend for the current billing cycle.
 *
 * `spendCents` is on-demand spend only; `overallSpendCents` includes included
 * (subscription) usage too. Since 2026-06-04 both fields carry extra decimal
 * precision specifically to avoid rounding drift against invoice totals — do
 * not round them before comparing to a bill.
 */
const spendGet: ActionDefinition<Input> = {
  key: "spend-get",
  type: "read",
  resource: "spend",
  title: "Get Spending Data",
  description:
    "Retrieve spending information for the current billing cycle, with search, sorting and " +
    "pagination.",
  params: [
    {
      key: "searchTerm",
      label: "Search term",
      type: "string",
      hint: "Search in user names and emails.",
    },
    {
      key: "sortBy",
      label: "Sort by",
      type: "string",
      hint: "Field to sort on, e.g. spendCents.",
    },
    {
      key: "sortDirection",
      label: "Sort direction",
      type: "select",
      options: [
        { value: "asc", label: "Ascending" },
        { value: "desc", label: "Descending" },
      ],
    },
    ...pageParams(25, "Results per page."),
  ],
  output: [
    { key: "teamMemberSpend", type: "array", label: "Per-member spend" },
    { key: "subscriptionCycleStart", type: "number", label: "Billing cycle start (epoch ms)" },
    { key: "totalMembers", type: "number", label: "Total members" },
    { key: "totalPages", type: "number", label: "Total pages" },
  ],

  execute(input, ctx) {
    return new CursorClient(ctx).post("/teams/spend", {
      searchTerm: input.searchTerm,
      sortBy: input.sortBy,
      sortDirection: input.sortDirection,
      page: input.page,
      pageSize: input.pageSize,
    });
  },
};

export default spendGet;
