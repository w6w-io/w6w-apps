import type { ActionDefinition } from "@w6w/types";
import { MercuryClient } from "../lib/client.ts";
import { accountIdParam, paginationParams } from "../lib/params.ts";

/**
 * `GET /account/{accountId}/statements` — monthly statements for one
 * account. `operationId: getAccountStatements`. Default sort order is
 * `desc` here (unlike most other list endpoints in this API, which default
 * `asc`) — most recent statement first.
 */
interface Input {
  accountId: string;
  limit?: number;
  order?: "asc" | "desc";
  startAfter?: string;
  endBefore?: string;
  start?: string;
  end?: string;
}

interface StatementsResponse {
  statements?: unknown[];
  page?: { nextPage?: string; previousPage?: string };
}

const accountStatementList: ActionDefinition<Input> = {
  key: "account-statement-list",
  type: "search",
  resource: "statement",
  title: "List Account Statements",
  description: "List monthly statements for a single account.",
  params: [
    accountIdParam,
    ...paginationParams(1000, "desc"),
    {
      key: "start",
      label: "Period start on/after",
      type: "string",
      advanced: true,
      placeholder: "2026-01-01",
      hint: "Filter statements where the period start date is on or after this date (YYYY-MM-DD).",
    },
    {
      key: "end",
      label: "Period start on/before",
      type: "string",
      advanced: true,
      placeholder: "2026-12-31",
      hint: "Filter statements where the period start date is on or before this date (YYYY-MM-DD).",
    },
  ],
  output: [
    { key: "items", type: "array", label: "Statements" },
    { key: "nextPage", type: "string", label: "Cursor for the next page" },
    { key: "previousPage", type: "string", label: "Cursor for the previous page" },
  ],

  async execute(input, ctx) {
    const body = await new MercuryClient(ctx).json<StatementsResponse>(
      `/account/${encodeURIComponent(input.accountId)}/statements`,
      {
        query: {
          limit: input.limit,
          order: input.order,
          start_after: input.startAfter,
          end_before: input.endBefore,
          start: input.start,
          end: input.end,
        },
      },
    );
    return {
      items: body?.statements ?? [],
      nextPage: body?.page?.nextPage,
      previousPage: body?.page?.previousPage,
    };
  },
};

export default accountStatementList;
