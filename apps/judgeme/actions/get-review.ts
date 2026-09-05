import type { ActionDefinition } from "@w6w/types";
import { JudgeMeClient } from "../lib/client.ts";

/**
 * `GET /reviews/{id}` — Get.
 *
 * Unlike the reviewer/product path params, the document gives this one no
 * `-1` sentinel for finding by another field — `id` must be Judge.me's own
 * internal review id.
 */
interface Input {
  id: number;
}

const getReview: ActionDefinition<Input> = {
  key: "get-review",
  type: "read",
  resource: "review",
  title: "Get Review",
  description: "Fetch a single review by Judge.me's internal review id.",
  params: [
    { key: "id", label: "Review ID", type: "number", required: true },
  ],
  output: [
    { key: "review", type: "object", label: "Review" },
  ],

  async execute(input, ctx) {
    const body = await new JudgeMeClient(ctx).json<{ review?: unknown }>(
      `/reviews/${encodeURIComponent(String(input.id))}`,
    );
    return { review: body?.review };
  },
};

export default getReview;
