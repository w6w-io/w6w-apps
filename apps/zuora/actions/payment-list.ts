import type { ActionDefinition } from "@w6w/types";
import { ZuoraClient } from "../lib/client.ts";
import { LIST_PARAMS, listOptions } from "../lib/params.ts";

/**
 * `GET /object-query/payments` — verified against
 * `developer.zuora.com/v1-api-reference/api/object-queries/querypayments`.
 *
 * The classic `/v1/payments` list/get/create/update/delete endpoints are all
 * documented as "only available if you have Invoice Settlement enabled" — a
 * feature not every tenant has turned on. Object Query's `/object-query/payments`
 * carries no such note, so this app lists and reads payments through it
 * rather than the feature-gated classic endpoints.
 */
const action: ActionDefinition = {
  key: "payment-list",
  type: "read",
  resource: "payment",
  title: "List Payments",
  description: "List payments, with optional Object Query filter/sort clauses.",
  params: [...LIST_PARAMS],
  output: [
    { key: "payments", type: "array", label: "Payments" },
    { key: "count", type: "number", label: "Payments returned" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const client = new ZuoraClient(ctx);
    const { filters, query } = listOptions(p);
    const want = p.returnAll === true ? Infinity : Math.max(1, Number(p.limit ?? 20));
    const page = await client.pageAll(
      "/payments",
      { filters, query },
      want,
      Math.max(1, Number(p.maxPages ?? 20)),
    );
    return { payments: page.items, count: page.items.length };
  },
};

export default action;
