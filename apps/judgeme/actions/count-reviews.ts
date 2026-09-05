import type { ActionDefinition } from "@w6w/types";
import { compact, JudgeMeClient } from "../lib/client.ts";

/**
 * `GET /reviews/count` — Count.
 *
 * The document gives this endpoint parameters and a description ("Get count
 * of reviews for a specific product or reviewer...") but **no response
 * schema and no example** — its `200` entry is `{"description": "", "headers":
 * {}}` with no `content` block at all. Rather than guess a `{ count: number }`
 * shape that was never actually documented, this action returns the parsed
 * response body verbatim and lets the caller inspect it.
 */
interface Input {
  reviewerId?: number;
  productId?: number;
  rating?: number;
}

interface Output {
  result: unknown;
}

const countReviews: ActionDefinition<Input, Output> = {
  key: "count-reviews",
  type: "read",
  resource: "review",
  title: "Count Reviews",
  description:
    "Count reviews for a product or reviewer, or for the whole shop when both are omitted. The " +
    "vendor's OpenAPI document does not specify a response schema for this endpoint, so the raw " +
    "response body is returned as-is.",
  params: [
    {
      key: "reviewerId",
      label: "Reviewer ID",
      type: "number",
      hint: "Judge.me's internal id of the reviewer.",
    },
    {
      key: "productId",
      label: "Product ID",
      type: "number",
      hint: "Judge.me's internal id of the product.",
    },
    {
      key: "rating",
      label: "Rating",
      type: "select",
      options: [1, 2, 3, 4, 5].map((n) => ({ value: n, label: String(n) })),
      hint: "Only count reviews with this star rating.",
    },
  ],
  output: [
    { key: "result", type: "object", label: "Raw response body (shape undocumented by Judge.me)" },
  ],

  async execute(input, ctx) {
    const result = await new JudgeMeClient(ctx).json<Record<string, unknown>>("/reviews/count", {
      query: compact({
        reviewer_id: input.reviewerId,
        product_id: input.productId,
        rating: input.rating,
      }),
    });
    return { result };
  },
};

export default countReviews;
