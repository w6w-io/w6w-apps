import type { ActionDefinition } from "@w6w/types";
import { compact, JudgeMeClient } from "../lib/client.ts";

/**
 * `GET /reviews` — Index.
 *
 * Returns every product and store review for the connected shop, or the
 * reviews for one product when `productId` is given.
 *
 * `productId`/`reviewerId` are Judge.me's own **internal** ids (`internal_id`
 * in the document), not the external (Shopify/etc.) id the review itself
 * carries as `product_external_id`. The document gives `/reviews` no way to
 * filter by the external product id directly — resolve it to Judge.me's
 * internal id first (e.g. via a widget lookup) if that's what you have.
 */
interface Input {
  page?: number;
  perPage?: number;
  reviewerId?: number;
  productId?: number;
  rating?: number;
}

interface Output {
  currentPage?: number;
  perPage?: number;
  reviews: unknown[];
}

const listReviews: ActionDefinition<Input, Output> = {
  key: "list-reviews",
  type: "read",
  resource: "review",
  title: "List Reviews",
  description:
    "List reviews for the shop, or for one product when Product ID is given. Product ID and " +
    "Reviewer ID are Judge.me's internal ids, not the store platform's external ids.",
  params: [
    { key: "page", label: "Page", type: "number", hint: "For pagination. Defaults to 1." },
    {
      key: "perPage",
      label: "Per Page",
      type: "number",
      hint: "For pagination. Defaults to Judge.me's own page size.",
    },
    {
      key: "reviewerId",
      label: "Reviewer ID",
      type: "number",
      hint: "Judge.me's internal id of the reviewer, to list only their reviews.",
    },
    {
      key: "productId",
      label: "Product ID",
      type: "number",
      hint: "Judge.me's internal id of the product. Omit to include store-level reviews too.",
    },
    {
      key: "rating",
      label: "Rating",
      type: "select",
      options: [1, 2, 3, 4, 5].map((n) => ({ value: n, label: String(n) })),
      hint: "Only include reviews with this star rating.",
    },
  ],
  output: [
    { key: "currentPage", type: "number", label: "Current page" },
    { key: "perPage", type: "number", label: "Page size" },
    { key: "reviews", type: "array", label: "Reviews" },
  ],

  async execute(input, ctx) {
    const body = await new JudgeMeClient(ctx).json<{
      current_page?: number;
      per_page?: number;
      reviews?: unknown[];
    }>("/reviews", {
      query: compact({
        page: input.page,
        per_page: input.perPage,
        reviewer_id: input.reviewerId,
        product_id: input.productId,
        rating: input.rating,
      }),
    });
    return {
      currentPage: body?.current_page,
      perPage: body?.per_page,
      reviews: body?.reviews ?? [],
    };
  },
};

export default listReviews;
