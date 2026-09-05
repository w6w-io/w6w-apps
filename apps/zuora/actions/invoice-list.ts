import type { ActionDefinition } from "@w6w/types";
import { ZuoraClient } from "../lib/client.ts";
import { LIST_PARAMS, listOptions } from "../lib/params.ts";

/**
 * `GET /object-query/invoices` — verified against
 * `developer.zuora.com/v1-api-reference/api/object-queries/queryinvoices`.
 */
const action: ActionDefinition = {
  key: "invoice-list",
  type: "read",
  resource: "invoice",
  title: "List Invoices",
  description: "List invoices, with optional Object Query filter/sort clauses.",
  params: [...LIST_PARAMS],
  output: [
    { key: "invoices", type: "array", label: "Invoices" },
    { key: "count", type: "number", label: "Invoices returned" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const client = new ZuoraClient(ctx);
    const { filters, query } = listOptions(p);
    const want = p.returnAll === true ? Infinity : Math.max(1, Number(p.limit ?? 20));
    const page = await client.pageAll(
      "/invoices",
      { filters, query },
      want,
      Math.max(1, Number(p.maxPages ?? 20)),
    );
    return { invoices: page.items, count: page.items.length };
  },
};

export default action;
