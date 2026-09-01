import type { ActionDefinition } from "@w6w/types";
import { requestApi } from "../lib/client.ts";
import { businessUnitIdParam, pageParams } from "../lib/params.ts";

/**
 * `GET /v1/product-reviews/business-units/{businessUnitId}/reviews` — public, API-Key
 * auth.
 *
 * "Get product reviews based on SKUs and / or productUrls. Response includes reviews
 * content, date of review creation, star rating, ID and consumer display name." At least
 * one of `sku` or `productUrl` is required, per Trustpilot's own note.
 */
interface Input {
  businessUnitId: string;
  sku?: string;
  productUrl?: string;
  language?: string;
  stars?: number;
  locale?: string;
  page?: number;
  perPage?: number;
}

interface ProductReviewConsumer {
  id?: string;
  displayName?: string;
}

interface ProductReview {
  id?: string;
  createdAt?: string;
  stars?: number;
  content?: string;
  consumer?: ProductReviewConsumer;
  language?: string;
}

interface Output {
  items: ProductReview[];
}

const productReviewList: ActionDefinition<Input, Output> = {
  key: "product-review-list",
  type: "search",
  resource: "product-review",
  title: "List Product Reviews",
  description: "List product reviews for one or more SKUs and/or product URLs. At least " +
    "one of SKU or Product URL is required.",
  params: [
    businessUnitIdParam,
    {
      key: "sku",
      label: "SKU(s)",
      type: "string",
      placeholder: "ABCD-1234,ACDC-4321",
      hint: "One or more comma-separated SKUs. Required if Product URL is empty.",
    },
    {
      key: "productUrl",
      label: "Product URL(s)",
      type: "string",
      hint: "One or more product URLs. Required if SKU is empty.",
    },
    {
      key: "language",
      label: "Language",
      type: "string",
      placeholder: "en",
    },
    {
      key: "stars",
      label: "Stars",
      type: "number",
      validation: { integer: true, min: 1, max: 5 },
    },
    {
      key: "locale",
      label: "Attribute locale",
      type: "string",
      placeholder: "da-DK",
      hint: 'Locale to translate any attribute names (e.g. "Quality") into.',
    },
    ...pageParams("Left empty uses Trustpilot's default page size."),
  ],
  output: [
    { key: "items", type: "array", label: "Product reviews" },
  ],

  async execute(input, ctx) {
    if (!input.sku && !input.productUrl) {
      throw new Error("either sku or productUrl is required");
    }
    const body = await requestApi<{ productReviews?: ProductReview[] }>(
      ctx,
      `/product-reviews/business-units/${encodeURIComponent(input.businessUnitId)}/reviews`,
      {
        query: {
          sku: input.sku,
          productUrl: input.productUrl,
          language: input.language,
          stars: input.stars,
          locale: input.locale,
          page: input.page,
          perPage: input.perPage,
        },
      },
    );
    return { items: body?.productReviews ?? [] };
  },
};

export default productReviewList;
