import type { ActionDefinition } from "@w6w/types";
import { FreshsalesClient } from "../lib/client.ts";
import { pagination, viewIdParam } from "../lib/params.ts";

interface Input {
  viewId: number;
  page?: number;
  perPage?: number;
}

/**
 * Freshsales has no flat "list all deals" endpoint — listing always goes
 * through a saved view (`/api/deals/view/[view_id]`). See "List Views" to
 * find a view id.
 */
const dealGetMany: ActionDefinition<Input> = {
  key: "deal-get-many",
  type: "search",
  resource: "deal",
  title: "List Deals",
  description:
    'List deals from a saved view. Freshsales has no flat "list all" endpoint — every listing ' +
    'goes through a view; use "List Views" to find one.',
  params: [viewIdParam("deals"), ...pagination],
  output: [
    { key: "deals", type: "array", label: "Deals" },
    { key: "total", type: "number", label: "Total (this view)" },
  ],

  async execute(input, ctx) {
    const { items, total } = await new FreshsalesClient(ctx).list(
      "deals",
      `/deals/view/${input.viewId}`,
      { query: { page: input.page, per_page: input.perPage } },
    );
    return { deals: items, total };
  },
};

export default dealGetMany;
