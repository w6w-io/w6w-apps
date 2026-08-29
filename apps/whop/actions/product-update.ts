import type { ActionDefinition } from "@w6w/types";
import { asOptionalJson, WhopClient } from "../lib/client.ts";
import { productIdParam } from "../lib/params.ts";

interface Input {
  productId: string;
  title?: string;
  description?: string;
  headline?: string;
  visibility?: string;
  metadata?: unknown;
}

const productUpdate: ActionDefinition<Input> = {
  key: "product-update",
  type: "perform",
  resource: "product",
  title: "Update Product",
  description: "Update an existing product's title, description, visibility or metadata.",
  idempotent: true,
  params: [
    productIdParam,
    { key: "title", label: "Title", type: "string" },
    { key: "description", label: "Description", type: "text" },
    { key: "headline", label: "Headline", type: "string" },
    {
      key: "visibility",
      label: "Visibility",
      type: "select",
      options: [
        { value: "visible", label: "Visible" },
        { value: "hidden", label: "Hidden" },
        { value: "archived", label: "Archived" },
      ],
    },
    {
      key: "metadata",
      label: "Metadata",
      type: "json",
      hint: "Custom key-value pairs to store on the product.",
    },
  ],
  output: [{ key: "data", type: "object", label: "The updated product" }],

  execute(input, ctx) {
    return new WhopClient(ctx).patch(`/products/${encodeURIComponent(input.productId)}`, {
      title: input.title,
      description: input.description,
      headline: input.headline,
      visibility: input.visibility,
      metadata: asOptionalJson(input.metadata, "metadata"),
    });
  },
};

export default productUpdate;
