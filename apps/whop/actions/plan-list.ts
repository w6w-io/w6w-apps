import type { ActionDefinition } from "@w6w/types";
import { resolveAccountId, toList, WhopClient, type WhopPage } from "../lib/client.ts";
import { accountIdParam, cursorParams, cursorQuery } from "../lib/params.ts";

/**
 * `GET /plans` — an account's plans, or a product's public buyable plans.
 *
 * `accountId` is required *unless* `productIds` is given, in which case the
 * read is public and returns only visible, non-invoice plans for those
 * products.
 */
interface Input {
  accountId?: string;
  productIds?: string[] | string;
  planTypes?: string[] | string;
  first?: number;
  after?: string;
  last?: number;
  before?: string;
}

const planList: ActionDefinition<Input> = {
  key: "plan-list",
  type: "search",
  resource: "plan",
  title: "List Plans",
  description: "List an account's plans, or the public buyable plans of one or more products.",
  params: [
    accountIdParam,
    {
      key: "productIds",
      label: "Product IDs",
      type: "multiselect",
      hint: "Omit Account ID and set this to make a public, unauthenticated read of these " +
        "products' visible buyable plans.",
    },
    {
      key: "planTypes",
      label: "Plan types",
      type: "multiselect",
      options: [
        { value: "renewal", label: "Recurring (renewal)" },
        { value: "one_time", label: "One-time" },
      ],
    },
    ...cursorParams(),
  ],
  output: [
    { key: "data", type: "array", label: "Plans" },
    { key: "page_info", type: "object", label: "Pagination cursors" },
  ],

  execute(input, ctx) {
    const productIds = toList(input.productIds);
    const accountId = productIds ? input.accountId : resolveAccountId(input.accountId, ctx);
    return new WhopClient(ctx).get<WhopPage<unknown>>("/plans", {
      account_id: accountId,
      product_ids: productIds,
      plan_types: toList(input.planTypes),
      ...cursorQuery(input),
    });
  },
};

export default planList;
