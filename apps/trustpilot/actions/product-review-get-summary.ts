import type { ActionDefinition } from "@w6w/types";
import { requestApi } from "../lib/client.ts";
import { businessUnitIdParam } from "../lib/params.ts";

/**
 * `GET /v1/product-reviews/business-units/{businessUnitId}` — public, API-Key auth.
 *
 * Star-rating summary for one or more SKUs. Trustpilot's reference: "You must specify
 * parameters for either SKUs, productUrls or both" — this app exposes SKUs, which is the
 * common case; use `product-review-batch-summaries` (POST) for a larger SKU set.
 */
interface Input {
  businessUnitId: string;
  sku: string;
}

interface NumberOfReviews {
  total?: number;
  oneStar?: number;
  twoStars?: number;
  threeStars?: number;
  fourStars?: number;
  fiveStars?: number;
}

interface Output {
  numberOfReviews?: NumberOfReviews;
  starsAverage?: number;
}

const productReviewGetSummary: ActionDefinition<Input, Output> = {
  key: "product-review-get-summary",
  type: "read",
  resource: "product-review",
  title: "Get Product Review Summary",
  description: "Get the star-rating summary (average, count and distribution) for one or " +
    "more product SKUs.",
  params: [
    businessUnitIdParam,
    {
      key: "sku",
      label: "SKU(s)",
      type: "string",
      required: true,
      placeholder: "ABCD-1234,ACDC-4321",
      hint: "One SKU, or several comma-separated.",
    },
  ],
  output: [
    { key: "numberOfReviews", type: "object", label: "Review count by rating" },
    { key: "starsAverage", type: "number", label: "Average star rating" },
  ],

  async execute(input, ctx) {
    return await requestApi<Output>(
      ctx,
      `/product-reviews/business-units/${encodeURIComponent(input.businessUnitId)}`,
      { query: { sku: input.sku } },
    );
  },
};

export default productReviewGetSummary;
