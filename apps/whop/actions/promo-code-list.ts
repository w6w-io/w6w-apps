import type { ActionDefinition } from "@w6w/types";
import { requireAccountId, toList, WhopClient, type WhopPage } from "../lib/client.ts";
import {
  accountIdParam,
  createdWindowParams,
  createdWindowQuery,
  cursorParams,
  cursorQuery,
  promoCodeStatusOptions,
} from "../lib/params.ts";

/** `GET /promo_codes` — `accountId` is required, with no default mode to fall back to. */
interface Input {
  accountId?: string;
  status?: string;
  productIds?: string[] | string;
  planIds?: string[] | string;
  createdAfter?: string;
  createdBefore?: string;
  first?: number;
  after?: string;
  last?: number;
  before?: string;
}

const promoCodeList: ActionDefinition<Input> = {
  key: "promo-code-list",
  type: "search",
  resource: "promo-code",
  title: "List Promo Codes",
  description: "List an account's promo codes.",
  params: [
    accountIdParam,
    { key: "status", label: "Status", type: "select", options: promoCodeStatusOptions },
    { key: "productIds", label: "Product IDs", type: "multiselect" },
    { key: "planIds", label: "Plan IDs", type: "multiselect" },
    ...createdWindowParams,
    ...cursorParams(),
  ],
  output: [
    { key: "data", type: "array", label: "Promo codes" },
    { key: "page_info", type: "object", label: "Pagination cursors" },
  ],

  execute(input, ctx) {
    return new WhopClient(ctx).get<WhopPage<unknown>>("/promo_codes", {
      account_id: requireAccountId(input.accountId, ctx),
      status: input.status,
      product_ids: toList(input.productIds),
      plan_ids: toList(input.planIds),
      ...createdWindowQuery(input),
      ...cursorQuery(input),
    });
  },
};

export default promoCodeList;
