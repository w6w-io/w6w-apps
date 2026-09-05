import type { ActionDefinition } from "@w6w/types";
import { ZuoraClient } from "../lib/client.ts";
import { LIST_PARAMS, listOptions } from "../lib/params.ts";

/**
 * `GET /object-query/orders` — verified against
 * `developer.zuora.com/v1-api-reference/api/object-queries/queryorders`.
 *
 * The classic `GET /v1/orders` is documented as requiring the (now-legacy)
 * "Order Metrics" feature, which Zuora's docs say is "no longer available as
 * a standalone feature" as of Billing Release 284 — Object Query carries no
 * such note, so this app lists orders through it instead.
 */
const action: ActionDefinition = {
  key: "order-list",
  type: "read",
  resource: "order",
  title: "List Orders",
  description: "List orders, with optional Object Query filter/sort clauses.",
  params: [...LIST_PARAMS],
  output: [
    { key: "orders", type: "array", label: "Orders" },
    { key: "count", type: "number", label: "Orders returned" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const client = new ZuoraClient(ctx);
    const { filters, query } = listOptions(p);
    const want = p.returnAll === true ? Infinity : Math.max(1, Number(p.limit ?? 20));
    const page = await client.pageAll(
      "/orders",
      { filters, query },
      want,
      Math.max(1, Number(p.maxPages ?? 20)),
    );
    return { orders: page.items, count: page.items.length };
  },
};

export default action;
