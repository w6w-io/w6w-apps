import type { ActionDefinition } from "@w6w/types";
import { MercuryClient } from "../lib/client.ts";
import { paginationParams } from "../lib/params.ts";

/**
 * `GET /accounts` — every Mercury account (checking, savings, treasury,
 * credit, ...) the token can see. `operationId: getAccounts`.
 *
 * Cursor-paginated: `limit` (1–1000, default 1000), `order` (default `asc`),
 * `start_after`/`end_before`. The response envelope is `{ accounts: [...],
 * page: { nextPage, previousPage } }` — re-presented here as `{ items,
 * nextPage, previousPage }` for a consistent shape across this app's list
 * actions.
 */
interface Input {
  limit?: number;
  order?: "asc" | "desc";
  startAfter?: string;
  endBefore?: string;
}

interface AccountsResponse {
  accounts?: unknown[];
  page?: { nextPage?: string; previousPage?: string };
}

const accountList: ActionDefinition<Input> = {
  key: "account-list",
  type: "search",
  resource: "account",
  title: "List Accounts",
  description: "List every Mercury account the connected token can see.",
  params: paginationParams(1000, "asc"),
  output: [
    { key: "items", type: "array", label: "Accounts" },
    { key: "nextPage", type: "string", label: "Cursor for the next page" },
    { key: "previousPage", type: "string", label: "Cursor for the previous page" },
  ],

  async execute(input, ctx) {
    const body = await new MercuryClient(ctx).json<AccountsResponse>("/accounts", {
      query: {
        limit: input.limit,
        order: input.order,
        start_after: input.startAfter,
        end_before: input.endBefore,
      },
    });
    return {
      items: body?.accounts ?? [],
      nextPage: body?.page?.nextPage,
      previousPage: body?.page?.previousPage,
    };
  },
};

export default accountList;
