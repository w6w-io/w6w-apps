import type { ActionDefinition } from "@w6w/types";
import { requestApi } from "../lib/client.ts";
import { businessUnitIdParam } from "../lib/params.ts";

/**
 * `GET /v1/business-units/{businessUnitId}/all-reviews` — public, API-Key auth.
 *
 * Trustpilot's own description: "Get a list of all reviews for a Business Unit. Use
 * pageToken to paginate through reviews. This is a public endpoint and won't return
 * customer emails or order IDs." Cursor-paginated via `nextPageToken`, unlike
 * `business-unit-reviews-list`'s page/perPage — pass the previous call's `nextCursor`
 * back in as `pageToken` to keep going, and stop once it comes back empty.
 */
interface Input {
  businessUnitId: string;
  pageToken?: string;
}

interface CompanyReply {
  text?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface Consumer {
  displayLocation?: string;
  displayName?: string;
  id?: string;
}

interface Review {
  id?: string;
  stars?: number;
  title?: string;
  text?: string;
  language?: string;
  createdAt?: string;
  updatedAt?: string;
  experiencedAt?: string;
  isVerified?: boolean;
  companyReply?: CompanyReply;
  consumer?: Consumer;
  location?: { id?: string; name?: string };
}

interface Output {
  items: Review[];
  nextCursor?: string;
}

const businessUnitReviewsListAll: ActionDefinition<Input, Output> = {
  key: "business-unit-reviews-list-all",
  type: "search",
  resource: "review",
  title: "List All Business Unit Reviews (cursor)",
  description: "List all of a Business Unit's service reviews, paginated by cursor — the " +
    "page-safe form Trustpilot recommends for scraping every review. Does not return " +
    "customer emails or order IDs.",
  params: [
    businessUnitIdParam,
    {
      key: "pageToken",
      label: "Page token",
      type: "string",
      hint: "The `nextCursor` from a previous call. Leave empty to start from the first page.",
    },
  ],
  output: [
    { key: "items", type: "array", label: "Reviews" },
    { key: "nextCursor", type: "string", label: "Token for the next page" },
  ],

  async execute(input, ctx) {
    const body = await requestApi<{ reviews?: Review[]; nextPageToken?: string }>(
      ctx,
      `/business-units/${encodeURIComponent(input.businessUnitId)}/all-reviews`,
      { query: { pageToken: input.pageToken } },
    );
    return { items: body?.reviews ?? [], nextCursor: body?.nextPageToken };
  },
};

export default businessUnitReviewsListAll;
