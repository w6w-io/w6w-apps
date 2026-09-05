import type { ActionDefinition } from "@w6w/types";
import { InvoiceNinjaClient, unset } from "../lib/client.ts";
import { pagination, statusFilter } from "../lib/params.ts";

interface Input {
  productKey?: string;
  status?: string[];
  page?: number;
  perPage?: number;
}

/** `GET /api/v1/products` — verified against `getProducts`, including its own `product_key` filter. */
const productGetMany: ActionDefinition<Input> = {
  key: "product-get-many",
  type: "search",
  resource: "product",
  title: "List Products",
  description: "List products, optionally filtered by product key.",
  params: [
    { key: "productKey", label: "Product key", type: "string" },
    statusFilter,
    ...pagination,
  ],
  output: [{ key: "data", type: "array", label: "Products" }],

  execute(input, ctx) {
    return new InvoiceNinjaClient(ctx).request("/products", {
      query: {
        product_key: unset(input.productKey),
        status: input.status?.length ? input.status.join(",") : undefined,
        page: input.page,
        per_page: input.perPage,
      },
    });
  },
};

export default productGetMany;
