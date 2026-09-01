import type { ActionDefinition } from "@w6w/types";
import { requestApi } from "../lib/client.ts";
import { businessUnitIdParam } from "../lib/params.ts";

/**
 * `POST /v1/product-reviews/business-units/{businessUnitId}/batch-summaries` — public,
 * API-Key auth.
 *
 * Same summary shape as `product-review-get-summary`, but for a batch of SKUs in one
 * call, each keyed by its own `sku` in the response. `POST` here carries the SKU list as
 * a JSON body rather than mutating anything server-side, so this is declared `search`
 * (a query), not `perform`.
 */
interface Input {
  businessUnitId: string;
  skus: string;
}

interface NumberOfReviews {
  total?: number;
  oneStar?: number;
  twoStars?: number;
  threeStars?: number;
  fourStars?: number;
  fiveStars?: number;
}

interface SkuSummary {
  sku?: string;
  numberOfReviews?: NumberOfReviews;
  starsAverage?: number;
}

interface Output {
  items: SkuSummary[];
}

/** Turn a comma/newline-separated string param into a clean SKU array. */
function parseSkus(raw: string): string[] {
  return raw.split(/[\n,]/).map((s) => s.trim()).filter(Boolean);
}

const productReviewBatchSummaries: ActionDefinition<Input, Output> = {
  key: "product-review-batch-summaries",
  type: "search",
  resource: "product-review",
  title: "Get Batch Product Review Summaries",
  description: "Get star-rating summaries for multiple product SKUs in one call.",
  params: [
    businessUnitIdParam,
    {
      key: "skus",
      label: "SKUs",
      type: "text",
      required: true,
      placeholder: "ABCD-1234\nACDC-4321",
      hint: "One SKU per line, or comma-separated.",
    },
  ],
  output: [
    { key: "items", type: "array", label: "Summaries, one per SKU" },
  ],

  async execute(input, ctx) {
    const skus = parseSkus(input.skus);
    if (skus.length === 0) throw new Error("skus must contain at least one SKU");
    const body = await requestApi<{ summaries?: SkuSummary[] }>(
      ctx,
      `/product-reviews/business-units/${encodeURIComponent(input.businessUnitId)}/batch-summaries`,
      { method: "POST", body: { skus } },
    );
    return { items: body?.summaries ?? [] };
  },
};

export default productReviewBatchSummaries;
