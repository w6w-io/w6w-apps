import type { ActionDefinition } from "@w6w/types";
import { HotmartClient, type HotmartListPage, PRODUCTS_PREFIX } from "../lib/client.ts";
import {
  paginationParams,
  paginationQuery,
  productFormatOptions,
  productStatusOptions,
} from "../lib/params.ts";

/**
 * `GET /products/api/v1/products` — verified against
 * `developers.hotmart.com/docs/en/v1/product/product-list/` on 2026-09-05.
 * Default page size is 50, per the vendor's own doc — stated as a hint here
 * rather than hardcoded as a param default, since it can change without
 * notice.
 */
interface Input {
  id?: number;
  status?: string;
  format?: string;
  maxResults?: number;
  pageToken?: string;
}

const productList: ActionDefinition<Input> = {
  key: "product-list",
  type: "read",
  title: "List Products",
  description:
    "List the creator's products: id, name, status, format, subscription flag, warranty period.",
  resource: "products",
  params: [
    { key: "id", label: "Product ID", type: "number", hint: "The 7-digit product ID." },
    { key: "status", label: "Status", type: "select", options: productStatusOptions },
    { key: "format", label: "Format", type: "select", options: productFormatOptions },
    ...paginationParams("Defaults to 50 items per page."),
  ],
  output: [
    { key: "items", type: "array", label: "Products" },
    { key: "page_info", type: "object", label: "Pagination" },
  ],

  async execute(input, ctx) {
    const client = new HotmartClient(ctx);
    return await client.json<HotmartListPage<unknown>>(`${PRODUCTS_PREFIX}/products`, {
      query: {
        id: input.id,
        status: input.status,
        format: input.format,
        ...paginationQuery(input),
      },
    });
  },
};

export default productList;
