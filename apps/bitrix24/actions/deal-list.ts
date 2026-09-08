import type { ActionDefinition } from "@w6w/types";
import { Bitrix24Client, compact, parseJson } from "../lib/client.ts";
import { LIST_PARAMS } from "../lib/params.ts";

interface Input {
  select?: string | string[];
  filter?: string | Record<string, unknown>;
  order?: string | Record<string, string>;
  start?: number;
}

interface ListOutput {
  results: unknown[];
  total: number;
  next?: number;
}

/**
 * `crm.deal.list` — verified against `api-reference/crm/deals/crm-deal-list.html`.
 * DEPRECATED by the vendor in favor of `crm.item.list` (see `README.md`).
 *
 * Page size is fixed at 50; pass the previous response's `next` back in
 * `start` to fetch the next page.
 */
const action: ActionDefinition<Input, ListOutput> = {
  key: "deal-list",
  type: "search",
  resource: "deal",
  title: "List Deals",
  description: "Search deals with an optional filter, field selection and sort.",
  params: LIST_PARAMS,
  output: [
    { key: "results", label: "Deals", type: "array" },
    { key: "total", label: "Total Matching", type: "number" },
    { key: "next", label: "Next Page Offset", type: "number" },
  ],

  async execute(input, ctx) {
    const select = parseJson(input.select, "select");
    if (select !== undefined && !Array.isArray(select)) {
      throw new Error("`select` must be a JSON array");
    }
    const filter = parseJson(input.filter, "filter");
    if (filter !== undefined && (typeof filter !== "object" || Array.isArray(filter))) {
      throw new Error("`filter` must be a JSON object");
    }
    const order = parseJson(input.order, "order");
    if (order !== undefined && (typeof order !== "object" || Array.isArray(order))) {
      throw new Error("`order` must be a JSON object");
    }

    ctx.log("info", "listing Bitrix24 deals", { start: input.start ?? 0 });
    const body = await new Bitrix24Client(ctx).callList<unknown>(
      "crm.deal.list",
      compact({ select, filter, order, start: input.start }),
    );
    return { results: body.result, total: body.total, next: body.next };
  },
};

export default action;
