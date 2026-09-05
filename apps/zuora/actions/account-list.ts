import type { ActionDefinition } from "@w6w/types";
import { ZuoraClient } from "../lib/client.ts";
import { LIST_PARAMS, listOptions } from "../lib/params.ts";

/**
 * `GET /object-query/accounts` — verified against
 * `developer.zuora.com/v1-api-reference/api/object-queries/queryaccounts`.
 *
 * The classic `/v1/accounts` surface has no bulk listing operation at all —
 * only "retrieve one by key" and "retrieve a summary" (see `account-get.ts`).
 * Object Query is the only real "list accounts" endpoint Zuora documents, with
 * cursor pagination (`nextPage`) and filter/sort clauses (see `lib/params.ts`).
 */
const action: ActionDefinition = {
  key: "account-list",
  type: "read",
  resource: "account",
  title: "List Accounts",
  description: "List customer accounts, with optional Object Query filter/sort clauses.",
  params: [...LIST_PARAMS],
  output: [
    { key: "accounts", type: "array", label: "Accounts" },
    { key: "count", type: "number", label: "Accounts returned" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const client = new ZuoraClient(ctx);
    const { filters, query } = listOptions(p);
    const want = p.returnAll === true ? Infinity : Math.max(1, Number(p.limit ?? 20));
    const page = await client.pageAll(
      "/accounts",
      { filters, query },
      want,
      Math.max(1, Number(p.maxPages ?? 20)),
    );
    return { accounts: page.items, count: page.items.length };
  },
};

export default action;
