import type { ActionDefinition } from "@w6w/types";
import { ReadwiseClient } from "../lib/client.ts";

/**
 * `GET /api/v2/review/` — the day's Daily Review: Readwise's spaced-repetition
 * resurfacing queue. Takes no parameters.
 */
const dailyReviewGet: ActionDefinition<Record<string, never>> = {
  key: "daily-review-get",
  type: "read",
  resource: "daily-review",
  title: "Get Daily Review",
  description: "Read today's Daily Review highlights.",
  params: [],
  output: [
    { key: "review_id", type: "number", label: "Review ID" },
    { key: "review_url", type: "string", label: "Review URL" },
    { key: "review_completed", type: "boolean", label: "Completed" },
    { key: "highlights", type: "array", label: "Highlights in this review" },
  ],

  execute(_input, ctx) {
    return new ReadwiseClient(ctx).json("/review/");
  },
};

export default dailyReviewGet;
