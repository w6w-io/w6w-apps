import type { ActionDefinition } from "@w6w/types";
import { MercuryClient } from "../lib/client.ts";
import { paginationParams } from "../lib/params.ts";

/**
 * `GET /transactions` — every transaction across every account, with
 * filtering. `operationId: listTransactions`.
 *
 * Distinct from the per-account `GET /account/{accountId}/transactions`
 * endpoint (also in Mercury's OpenAPI document, under a different
 * operationId) — this app exposes the cross-account list, since a workflow
 * filtering by date/status/category rarely already knows which account to
 * scope to.
 */
interface Input {
  status?: string[];
  search?: string;
  start?: string;
  end?: string;
  postedStart?: string;
  postedEnd?: string;
  accountId?: string[];
  cardId?: string[];
  mercuryCategory?: string;
  categoryId?: string;
  limit?: number;
  order?: "asc" | "desc";
  startAfter?: string;
  endBefore?: string;
}

interface TransactionsResponse {
  transactions?: unknown[];
  page?: { nextPage?: string; previousPage?: string };
}

const transactionList: ActionDefinition<Input> = {
  key: "transaction-list",
  type: "search",
  resource: "transaction",
  title: "List Transactions",
  description: "List transactions across every account, with date, status, and category filters.",
  params: [
    {
      key: "status",
      label: "Status",
      type: "multiselect",
      options: [
        { value: "pending", label: "Pending" },
        { value: "sent", label: "Sent" },
        { value: "cancelled", label: "Cancelled" },
        { value: "failed", label: "Failed" },
        { value: "reversed", label: "Reversed" },
        { value: "blocked", label: "Blocked" },
      ],
    },
    {
      key: "search",
      label: "Search",
      type: "string",
      hint: "Search term to look for in transaction descriptions.",
    },
    {
      key: "start",
      label: "Created on/after",
      type: "string",
      placeholder: "2026-01-01",
      hint:
        "Earliest createdAt date (YYYY-MM-DD or ISO 8601). Note: the dashboard displays postedAt, not createdAt.",
    },
    { key: "end", label: "Created on/before", type: "string", placeholder: "2026-12-31" },
    { key: "postedStart", label: "Posted on/after", type: "string", advanced: true },
    { key: "postedEnd", label: "Posted on/before", type: "string", advanced: true },
    {
      key: "accountId",
      label: "Account IDs",
      type: "array",
      item: { type: "string" },
      advanced: true,
      hint: "Filter by one or more Mercury account UUIDs.",
    },
    {
      key: "cardId",
      label: "Card IDs",
      type: "array",
      item: { type: "string" },
      advanced: true,
    },
    {
      key: "mercuryCategory",
      label: "Merchant type (Mercury category)",
      type: "string",
      advanced: true,
    },
    { key: "categoryId", label: "Custom category ID", type: "string", advanced: true },
    ...paginationParams(1000, "asc"),
  ],
  output: [
    { key: "items", type: "array", label: "Transactions" },
    { key: "nextPage", type: "string", label: "Cursor for the next page" },
    { key: "previousPage", type: "string", label: "Cursor for the previous page" },
  ],

  async execute(input, ctx) {
    const body = await new MercuryClient(ctx).json<TransactionsResponse>("/transactions", {
      query: {
        status: input.status,
        search: input.search,
        start: input.start,
        end: input.end,
        postedStart: input.postedStart,
        postedEnd: input.postedEnd,
        accountId: input.accountId,
        cardId: input.cardId,
        mercuryCategory: input.mercuryCategory,
        categoryId: input.categoryId,
        limit: input.limit,
        order: input.order,
        start_after: input.startAfter,
        end_before: input.endBefore,
      },
    });
    return {
      items: body?.transactions ?? [],
      nextPage: body?.page?.nextPage,
      previousPage: body?.page?.previousPage,
    };
  },
};

export default transactionList;
