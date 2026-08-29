import type { ActionDefinition } from "@w6w/types";
import { ReadwiseClient } from "../lib/client.ts";

/**
 * `POST /api/v2/review/complete/` — mark today's Daily Review complete.
 *
 * Marking an already-completed review complete again leaves it in the same
 * state (`review_completed: true`), so this is `idempotent: true`.
 */
const dailyReviewComplete: ActionDefinition<Record<string, never>> = {
  key: "daily-review-complete",
  type: "perform",
  resource: "daily-review",
  title: "Complete Daily Review",
  description: "Mark today's Daily Review as complete.",
  idempotent: true,
  params: [],
  output: [
    { key: "review_id", type: "number", label: "Review ID" },
    { key: "review_completed", type: "boolean", label: "Completed" },
  ],

  execute(_input, ctx) {
    return new ReadwiseClient(ctx).json("/review/complete/", { method: "POST" });
  },
};

export default dailyReviewComplete;
