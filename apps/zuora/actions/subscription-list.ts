import type { ActionDefinition } from "@w6w/types";
import { ZuoraClient } from "../lib/client.ts";
import { LIST_PARAMS, listOptions } from "../lib/params.ts";

/**
 * `GET /object-query/subscriptions` — verified against
 * `developer.zuora.com/v1-api-reference/api/object-queries/querysubscriptions`.
 *
 * The classic `/v1/subscriptions/accounts/{account-key}` endpoint only lists
 * by account; Object Query lists across the whole tenant with arbitrary
 * filters (e.g. `filter=status.EQ:Active` with no account at all), which is
 * the more general "list subscriptions" a workflow usually wants. Filter on
 * `accountId`/`accountNumber` to scope to one account.
 */
const action: ActionDefinition = {
  key: "subscription-list",
  type: "read",
  resource: "subscription",
  title: "List Subscriptions",
  description: "List subscriptions, with optional Object Query filter/sort clauses.",
  params: [...LIST_PARAMS],
  output: [
    { key: "subscriptions", type: "array", label: "Subscriptions" },
    { key: "count", type: "number", label: "Subscriptions returned" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const client = new ZuoraClient(ctx);
    const { filters, query } = listOptions(p);
    const want = p.returnAll === true ? Infinity : Math.max(1, Number(p.limit ?? 20));
    const page = await client.pageAll(
      "/subscriptions",
      { filters, query },
      want,
      Math.max(1, Number(p.maxPages ?? 20)),
    );
    return { subscriptions: page.items, count: page.items.length };
  },
};

export default action;
