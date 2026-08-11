import type { ActionDefinition } from "@w6w/types";
import { PaddleClient, toList } from "../lib/client.ts";
import {
  entityStatusOptions,
  idsParam,
  itemTypeOptions,
  orderByParam,
  paginationParams,
  taxCategoryOptions,
} from "../lib/params.ts";

/**
 * `GET /products` — list catalog products.
 *
 * Paddle defaults this to `status=active`, so archived products are invisible
 * unless asked for. The `status` param says so rather than leaving a caller to
 * wonder where a product went.
 *
 * `include=prices` is the one call that returns a product and everything it can
 * be sold at in a single request; without it a pricing page needs one call per
 * product.
 */
interface Input {
  ids?: string;
  status?: string[] | string;
  taxCategory?: string[] | string;
  type?: string;
  includePrices?: boolean;
  orderBy?: string;
  perPage?: number;
  after?: string;
}

const productList: ActionDefinition<Input> = {
  key: "product-list",
  type: "search",
  resource: "product",
  title: "List Products",
  description: "List catalog products, optionally with their prices included.",
  params: [
    idsParam,
    {
      key: "status",
      label: "Status",
      type: "multiselect",
      options: entityStatusOptions,
      hint: "Paddle returns only `active` products when this is left empty.",
    },
    {
      key: "taxCategory",
      label: "Tax category",
      type: "multiselect",
      options: taxCategoryOptions,
    },
    { key: "type", label: "Type", type: "select", options: itemTypeOptions },
    {
      key: "includePrices",
      label: "Include prices",
      type: "boolean",
      hint: "Return each product's prices in the same response.",
    },
    orderByParam(
      "`created_at`, `custom_data`, `description`, `id`, `image_url`, `name`, `status`, " +
        "`tax_category`, `updated_at`",
    ),
    ...paginationParams("Default 50, maximum 200."),
  ],
  output: [
    { key: "data", type: "array", label: "Products" },
    { key: "meta", type: "object", label: "Request id and pagination cursor" },
  ],

  execute(input, ctx) {
    return new PaddleClient(ctx).envelope("/products", {
      query: {
        id: toList(input.ids),
        status: toList(input.status),
        tax_category: toList(input.taxCategory),
        type: input.type,
        include: input.includePrices ? "prices" : undefined,
        order_by: input.orderBy,
        per_page: input.perPage,
        after: input.after,
      },
    });
  },
};

export default productList;
