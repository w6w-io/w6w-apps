import type { ActionDefinition } from "@w6w/types";
import { PaddleClient, toList } from "../lib/client.ts";
import {
  entityStatusOptions,
  idsParam,
  itemTypeOptions,
  orderByParam,
  paginationParams,
} from "../lib/params.ts";

/**
 * `GET /prices` — list prices, optionally filtered to one product.
 *
 * Like products, this defaults to `status=active`. `recurring` is the fastest
 * way to separate subscription prices from one-time ones without inspecting
 * each `billing_cycle`.
 */
interface Input {
  ids?: string;
  productId?: string;
  status?: string[] | string;
  type?: string;
  recurring?: boolean;
  billingCycleInterval?: string;
  includeProduct?: boolean;
  orderBy?: string;
  perPage?: number;
  after?: string;
}

const priceList: ActionDefinition<Input> = {
  key: "price-list",
  type: "search",
  resource: "price",
  title: "List Prices",
  description: "List prices, optionally filtered to a product or to recurring prices only.",
  params: [
    idsParam,
    {
      key: "productId",
      label: "Product ID",
      type: "string",
      hint: "Return only prices for this product. Comma-separated for several.",
    },
    { key: "status", label: "Status", type: "multiselect", options: entityStatusOptions },
    { key: "type", label: "Type", type: "select", options: itemTypeOptions },
    {
      key: "recurring",
      label: "Recurring only",
      type: "boolean",
      hint: "`true` for subscription prices, `false` for one-time prices.",
    },
    {
      key: "billingCycleInterval",
      label: "Billing cycle interval",
      type: "select",
      options: [
        { value: "day", label: "Day" },
        { value: "week", label: "Week" },
        { value: "month", label: "Month" },
        { value: "year", label: "Year" },
      ],
    },
    { key: "includeProduct", label: "Include product", type: "boolean" },
    orderByParam(
      "`billing_cycle.frequency`, `billing_cycle.interval`, `id`, `product_id`, " +
        "`quantity.maximum`, `quantity.minimum`, `status`, `tax_mode`, `unit_price.amount`, " +
        "`unit_price.currency_code`",
    ),
    ...paginationParams("Default 50, maximum 200."),
  ],
  output: [
    { key: "data", type: "array", label: "Prices" },
    { key: "meta", type: "object", label: "Request id and pagination cursor" },
  ],

  execute(input, ctx) {
    return new PaddleClient(ctx).envelope("/prices", {
      query: {
        id: toList(input.ids),
        product_id: toList(input.productId),
        status: toList(input.status),
        type: input.type,
        recurring: input.recurring,
        "billing_cycle.interval": input.billingCycleInterval,
        include: input.includeProduct ? "product" : undefined,
        order_by: input.orderBy,
        per_page: input.perPage,
        after: input.after,
      },
    });
  },
};

export default priceList;
