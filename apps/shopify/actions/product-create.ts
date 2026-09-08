import type { ActionDefinition } from "@w6w/types";
import { ShopifyClient, unset } from "../lib/client.ts";

interface Input {
  title: string;
  bodyHtml?: string;
  vendor?: string;
  productType?: string;
  status?: string;
  tags?: string;
  variants?: unknown;
  images?: unknown;
  handle?: string;
  published?: boolean;
  publishedScope?: string;
  metafields?: unknown;
}

const productCreate: ActionDefinition<Input> = {
  key: "product-create",
  type: "perform",
  resource: "product",
  title: "Create Product",
  description: "Create a product. Shopify adds a default variant if none is supplied.",
  // Shopify mints a new product id per call and offers no request key.
  idempotent: false,
  params: [
    { key: "title", label: "Title", type: "string", required: true },
    {
      key: "bodyHtml",
      label: "Description",
      type: "text",
      config: { multiline: true },
      hint: "HTML — this is the storefront description.",
    },
    { key: "vendor", label: "Vendor", type: "string", row: "class" },
    { key: "productType", label: "Product type", type: "string", row: "class" },
    {
      key: "status",
      label: "Status",
      type: "select",
      default: "draft",
      options: [
        { value: "active", label: "Active" },
        { value: "draft", label: "Draft" },
        { value: "archived", label: "Archived" },
      ],
      hint: "Draft keeps it off the storefront until you publish.",
    },
    {
      key: "tags",
      label: "Tags",
      type: "string",
      hint: "Comma-separated, as Shopify stores them.",
    },
    {
      key: "variants",
      label: "Variants",
      type: "json",
      hint: 'Array of variants, e.g. [{ "option1": "Small", "price": "9.99", "sku": "S-1" }].',
    },
    {
      key: "images",
      label: "Images",
      type: "json",
      hint: 'Array of images, e.g. [{ "src": "https://…/mug.jpg" }].',
    },
    { key: "handle", label: "Handle", type: "string", hint: "The storefront URL slug." },
    {
      key: "published",
      label: "Published",
      type: "boolean",
      hint: "Shopify has no `published` flag at API 2024-07 — this maps to `published_at`. " +
        "On sets it to now; off sends `null` (unpublished), never the literal `false`. " +
        "Leave unset to not touch it.",
    },
    {
      key: "publishedScope",
      label: "Published scope",
      type: "select",
      options: [
        { value: "web", label: "Web (storefront)" },
        { value: "global", label: "Global (storefront + sales channels)" },
      ],
    },
    {
      key: "metafields",
      label: "Metafields",
      type: "json",
      hint: 'Array of { "key", "value", "type", "namespace" }.',
    },
  ],
  output: [
    { key: "product.id", type: "number", label: "Product ID" },
    { key: "product.title", type: "string", label: "Title" },
    { key: "product.handle", type: "string", label: "Handle" },
    { key: "product.variants", type: "array", label: "Variants" },
  ],

  execute(input, ctx) {
    return new ShopifyClient(ctx).request("/products.json", {
      method: "POST",
      body: {
        product: {
          title: input.title,
          body_html: unset(input.bodyHtml),
          vendor: unset(input.vendor),
          product_type: unset(input.productType),
          status: unset(input.status),
          tags: unset(input.tags),
          variants: input.variants,
          images: input.images,
          handle: unset(input.handle),
          published_at: input.published === undefined
            ? undefined
            : (input.published ? new Date().toISOString() : null),
          published_scope: unset(input.publishedScope),
          metafields: input.metafields,
        },
      },
    });
  },
};

export default productCreate;
