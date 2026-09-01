import type { ActionDefinition } from "@w6w/types";
import { requestApi } from "../lib/client.ts";
import { businessUnitIdParam, languageParam, pageParams, starsParam } from "../lib/params.ts";

/**
 * `GET /v1/business-units/{businessUnitId}/reviews` — public, API-Key auth.
 *
 * Page-based review listing with the full set of documented filters (rating, language,
 * location, tag, response state) and sort orders. For scraping *every* review without
 * page-drift as new ones arrive, use `business-unit-reviews-list-all` instead, which
 * Trustpilot's own reference names as the page-safe form ("Use pageToken to paginate
 * through reviews").
 */
interface Input {
  businessUnitId: string;
  stars?: number;
  language?: string;
  internalLocationId?: string;
  page?: number;
  perPage?: number;
  orderBy?: "createdat.asc" | "createdat.desc" | "stars.asc" | "stars.desc";
  tagGroup?: string;
  tagValue?: string;
  responded?: boolean;
  includeReportedReviews?: boolean;
}

interface CompanyReply {
  text?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface Consumer {
  displayLocation?: string;
  numberOfReviews?: number;
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
  experiencedAt?: string;
  updatedAt?: string;
  numberOfLikes?: number;
  isVerified?: boolean;
  status?: string;
  companyReply?: CompanyReply;
  consumer?: Consumer;
}

interface Output {
  items: Review[];
}

const businessUnitReviewsList: ActionDefinition<Input, Output> = {
  key: "business-unit-reviews-list",
  type: "search",
  resource: "review",
  title: "List Business Unit Reviews",
  description: "List a Business Unit's service reviews, with filtering and sorting.",
  params: [
    businessUnitIdParam,
    starsParam,
    languageParam,
    {
      key: "internalLocationId",
      label: "Location ID",
      type: "string",
      hint: "Filter to reviews for a specific business location.",
    },
    ...pageParams(
      "Trustpilot's own default and maximum is unspecified; left empty uses " +
        "Trustpilot's default page size.",
    ),
    {
      key: "orderBy",
      label: "Order by",
      type: "select",
      options: [
        { value: "createdat.desc", label: "Newest first" },
        { value: "createdat.asc", label: "Oldest first" },
        { value: "stars.desc", label: "Highest rated first" },
        { value: "stars.asc", label: "Lowest rated first" },
      ],
    },
    { key: "tagGroup", label: "Tag group", type: "string" },
    { key: "tagValue", label: "Tag value", type: "string" },
    { key: "responded", label: "Only responded reviews", type: "boolean" },
    { key: "includeReportedReviews", label: "Include reported reviews", type: "boolean" },
  ],
  output: [
    { key: "items", type: "array", label: "Reviews" },
  ],

  async execute(input, ctx) {
    const body = await requestApi<{ reviews?: Review[] }>(
      ctx,
      `/business-units/${encodeURIComponent(input.businessUnitId)}/reviews`,
      {
        query: {
          stars: input.stars,
          language: input.language,
          internalLocationId: input.internalLocationId,
          page: input.page,
          perPage: input.perPage,
          orderBy: input.orderBy,
          tagGroup: input.tagGroup,
          tagValue: input.tagValue,
          responded: input.responded,
          includeReportedReviews: input.includeReportedReviews,
        },
      },
    );
    return { items: body?.reviews ?? [] };
  },
};

export default businessUnitReviewsList;
