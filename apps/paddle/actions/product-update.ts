import type { ActionDefinition } from "@w6w/types";
import { asOptionalJson, compact, PaddleClient } from "../lib/client.ts";
import {
  customDataParam,
  entityStatusOptions,
  itemTypeOptions,
  taxCategoryOptions,
} from "../lib/params.ts";

/**
 * `PATCH /products/{product_id}` — update a product, or archive it.
 *
 * Paddle has no delete for products: archiving via `status` is the supported
 * way to retire one, which is why `status` is an ordinary field here rather
 * than a separate "archive product" action.
 *
 * Only the fields the caller filled in are sent (see `compact`) — a PATCH
 * applies exactly the keys present, so forwarding an untouched field as `null`
 * would wipe a real value.
 *
 * Idempotent: re-sending the same patch converges on the same entity.
 */
interface Input {
  productId: string;
  name?: string;
  description?: string;
  type?: string;
  taxCategory?: string;
  imageUrl?: string;
  status?: string;
  customData?: unknown;
}

const productUpdate: ActionDefinition<Input> = {
  key: "product-update",
  type: "perform",
  resource: "product",
  title: "Update Product",
  description: "Update a product's details, or archive it by setting its status.",
  idempotent: true,
  params: [
    {
      key: "productId",
      label: "Product ID",
      type: "string",
      required: true,
      validation: { pattern: "^pro_[a-z0-9]{26}$" },
    },
    { key: "name", label: "Name", type: "string", validation: { minLength: 1, maxLength: 200 } },
    { key: "description", label: "Description", type: "text", validation: { maxLength: 2048 } },
    { key: "type", label: "Type", type: "select", options: itemTypeOptions },
    { key: "taxCategory", label: "Tax category", type: "select", options: taxCategoryOptions },
    { key: "imageUrl", label: "Image URL", type: "string" },
    {
      key: "status",
      label: "Status",
      type: "select",
      options: entityStatusOptions,
      hint: "Products cannot be deleted. Set `archived` to retire one.",
    },
    customDataParam,
  ],
  output: [{ key: "data", type: "object", label: "The updated product" }],

  execute(input, ctx) {
    return new PaddleClient(ctx).request(`/products/${encodeURIComponent(input.productId)}`, {
      method: "PATCH",
      body: compact({
        name: input.name,
        description: input.description,
        type: input.type,
        tax_category: input.taxCategory,
        image_url: input.imageUrl,
        status: input.status,
        custom_data: asOptionalJson(input.customData, "Custom data"),
      }),
    });
  },
};

export default productUpdate;
