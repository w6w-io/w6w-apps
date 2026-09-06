import type { ActionDefinition } from "@w6w/types";
import { BooqableClient } from "../lib/client.ts";
import { includeParam } from "../lib/params.ts";

interface Input {
  productGroupId: string;
  include?: string;
}

/** `GET /product_groups/{id}` — verified against developers.booqable.com ("Fetch a product group"). */
const productGroupGet: ActionDefinition<Input> = {
  key: "product-group-get",
  type: "read",
  resource: "product-group",
  title: "Get Product Group",
  description: "Fetch a single product group by id.",
  params: [
    { key: "productGroupId", label: "Product Group ID", type: "string", required: true },
    { ...includeParam, placeholder: "photo,properties,tax_category,products" },
  ],
  output: [{ key: "data", type: "object", label: "The ProductGroup object" }],

  execute(input, ctx) {
    return new BooqableClient(ctx).request(`/product_groups/${input.productGroupId}`, {
      query: { include: input.include },
    });
  },
};

export default productGroupGet;
