import type { ActionDefinition } from "@w6w/types";
import { asOptionalJson, compact, PaddleClient } from "../lib/client.ts";
import { customDataParam, itemTypeOptions, taxCategoryOptions } from "../lib/params.ts";

/**
 * `POST /products` — create a catalog product.
 *
 * `tax_category` is required and must be one Paddle has **enabled on the
 * account**; picking an enabled-looking value the account does not have returns
 * a 400 naming the field. There is no API to list the enabled ones, so the full
 * documented vocabulary is offered and the error is left legible.
 *
 * Not idempotent: Paddle has no idempotency key on this endpoint and creates a
 * second product with the same name happily.
 */
interface Input {
  name: string;
  taxCategory: string;
  description?: string;
  type?: string;
  imageUrl?: string;
  customData?: unknown;
}

const productCreate: ActionDefinition<Input> = {
  key: "product-create",
  type: "perform",
  resource: "product",
  title: "Create Product",
  description: "Create a catalog product. Prices are attached to it separately.",
  idempotent: false,
  params: [
    {
      key: "name",
      label: "Name",
      type: "string",
      required: true,
      validation: { minLength: 1, maxLength: 200 },
    },
    {
      key: "taxCategory",
      label: "Tax category",
      type: "select",
      required: true,
      options: taxCategoryOptions,
      hint: "Must already be enabled on your Paddle account, or the request is rejected.",
    },
    {
      key: "description",
      label: "Description",
      type: "text",
      validation: { maxLength: 2048 },
    },
    { key: "type", label: "Type", type: "select", options: itemTypeOptions },
    {
      key: "imageUrl",
      label: "Image URL",
      type: "string",
      hint:
        "Paddle does not host images — this must be a publicly reachable HTTPS URL. Square (1:1) " +
        "is recommended.",
    },
    customDataParam,
  ],
  output: [{ key: "data", type: "object", label: "The created product" }],

  execute(input, ctx) {
    return new PaddleClient(ctx).request("/products", {
      method: "POST",
      body: compact({
        name: input.name,
        tax_category: input.taxCategory,
        description: input.description,
        type: input.type,
        image_url: input.imageUrl,
        custom_data: asOptionalJson(input.customData, "Custom data"),
      }),
    });
  },
};

export default productCreate;
