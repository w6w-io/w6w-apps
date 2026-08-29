import type { ActionDefinition } from "@w6w/types";
import { compact, TypefullyClient } from "../lib/client.ts";
import { paginationParams, socialSetIdParam } from "../lib/params.ts";

interface Input {
  socialSetId: number;
  platform: string;
  startDate: string;
  endDate: string;
  includeReplies?: boolean;
  limit?: number;
  offset?: number;
}

/**
 * `GET /v2/social-sets/{social_set_id}/analytics/{platform}/posts` —
 * per-post metrics (impressions, likes, comments, shares, quotes, saves,
 * profile clicks, link clicks) between `startDate` and `endDate`, inclusive.
 *
 * **Currently only `x` is supported** — this is the vendor's own stated
 * limitation as of 2026-08-29, not a gap in this app. Replies are excluded by
 * default. Date ranges over 366 days are rejected.
 */
const analyticsPostsList: ActionDefinition<Input> = {
  key: "analytics-posts-list",
  type: "search",
  resource: "analytics",
  title: "List Analytics Posts",
  description: "List posts with performance metrics for a platform. Currently X only.",
  params: [
    socialSetIdParam,
    {
      key: "platform",
      label: "Platform",
      type: "select",
      required: true,
      default: "x",
      options: [{ value: "x", label: "X" }],
      hint: "The vendor currently supports only x for analytics.",
    },
    {
      key: "startDate",
      label: "Start Date",
      type: "date",
      required: true,
      hint: "Range cannot exceed 366 days.",
    },
    { key: "endDate", label: "End Date", type: "date", required: true },
    {
      key: "includeReplies",
      label: "Include Replies",
      type: "boolean",
      default: false,
      hint: "When false (default), only non-reply posts are returned.",
    },
    ...paginationParams(25, 100),
  ],
  output: [
    { key: "results", type: "array", label: "Posts with normalized metrics" },
    { key: "count", type: "number", label: "Total available" },
    { key: "limit", type: "number", label: "Page size used" },
    { key: "offset", type: "number", label: "Offset used" },
  ],

  async execute(input, ctx) {
    return await new TypefullyClient(ctx).json(
      `/social-sets/${input.socialSetId}/analytics/${input.platform}/posts`,
      {
        query: compact({
          start_date: input.startDate,
          end_date: input.endDate,
          include_replies: input.includeReplies,
          limit: input.limit,
          offset: input.offset,
        }),
      },
    );
  },
};

export default analyticsPostsList;
