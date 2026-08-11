import type { ActionDefinition } from "@w6w/types";
import { eq, joinFilters, KeapClient, nextPageToken, V2 } from "../lib/client.ts";
import { filterParam, orderByParam, pageParams } from "../lib/params.ts";

/**
 * `GET /rest/v2/products` — List Products.
 *
 * The response rows are `RestV2Product_List`, a deliberately narrower schema
 * than the `RestV2Product` returned by `GET /products/{product_id}` — the list
 * form omits options, subscription plans and images. Keap gave the two shapes
 * different schema names rather than a `fields` selector, so there is no way to
 * widen the list; fetch the ids and read them individually if you need more.
 */
interface Input {
  name?: string;
  sku?: string;
  productIds?: string;
  filter?: string;
  orderBy?: string;
  pageSize?: number;
  pageToken?: string;
}

const productList: ActionDefinition<Input> = {
  key: "product-list",
  type: "search",
  title: "List Products",
  resource: "product",
  description: "Search the product catalogue by name, SKU or id.",
  params: [
    { key: "name", label: "Name", type: "string", hint: "Supports a trailing `*`." },
    { key: "sku", label: "SKU", type: "string", hint: "Supports a trailing `*`." },
    {
      key: "productIds",
      label: "Product IDs",
      type: "string",
      placeholder: "1,2,3",
      hint: "Comma-separated list of product ids.",
    },
    filterParam,
    orderByParam("One of `name`, `sku`, `last_updated_time`, plus `asc` or `desc`."),
    ...pageParams(),
  ],
  output: [
    { key: "products", type: "array", label: "Products" },
    { key: "count", type: "number", label: "Products returned" },
    { key: "nextPageToken", type: "string", label: "Next page token" },
  ],

  async execute(input, ctx) {
    const filter = joinFilters([
      eq("name", input.name),
      eq("sku", input.sku),
      eq("product_ids", input.productIds),
      input.filter,
    ]);
    const client = new KeapClient(ctx);
    const body = await client.json<{ products?: unknown[]; next_page_token?: string }>(
      `${V2}/products`,
      {
        query: {
          filter,
          order_by: input.orderBy,
          page_size: input.pageSize,
          page_token: input.pageToken,
        },
      },
    );
    const products = body?.products ?? [];
    return { products, count: products.length, nextPageToken: nextPageToken(body) };
  },
};

export default productList;
