import type { ActionDefinition } from "@w6w/types";
import { flag, RecruiteeClient } from "../lib/client.ts";
import { offerIdParam, sortOrderOptions } from "../lib/params.ts";

/**
 * `GET /c/{company_id}/offers/{offer_id}/placements` — "Placements list".
 *
 * Verified live shape: the response is **not** a flat list — it is
 * `{"stages": [{...stage fields, "placements": [...]}]}`, one entry per
 * pipeline stage with that stage's placements nested inside. That grouping is
 * kept as-is rather than flattened, since it is exactly how the pipeline
 * board itself is organized (candidates grouped under the stage they sit in).
 *
 * Recruitee documents many more `with_*` boolean flags on this endpoint
 * (`with_created_at`, `with_evaluations`, `with_locations`, …, each defaulting
 * to a documented value) than are exposed here; they only toggle which extra
 * fields ride along on each placement/candidate and are left at their
 * defaults rather than exposing a dozen booleans nobody is likely to need to
 * turn off.
 */
interface Input {
  offerId: number;
  stageId?: number;
  qualified?: boolean;
  disqualified?: boolean;
  sortBy?: string;
  sortOrder?: string;
}

const placementList: ActionDefinition<Input> = {
  key: "placement-list",
  type: "search",
  resource: "placement",
  title: "List Placements For Offer",
  description: "List an offer's pipeline, candidates grouped by the stage they're currently in.",
  params: [
    offerIdParam,
    { key: "stageId", label: "Filter by stage ID", type: "number", validation: { integer: true } },
    { key: "qualified", label: "Only qualified", type: "boolean" },
    { key: "disqualified", label: "Only disqualified", type: "boolean" },
    { key: "sortBy", label: "Sort by", type: "string" },
    { key: "sortOrder", label: "Sort order", type: "select", options: sortOrderOptions },
  ],
  output: [{ key: "stages", type: "array", label: "Pipeline stages, each with its placements" }],

  execute(input, ctx) {
    return new RecruiteeClient(ctx).request(`/offers/${input.offerId}/placements`, {
      query: {
        stage_id: input.stageId,
        qualified: flag(input.qualified),
        disqualified: flag(input.disqualified),
        sort_by: input.sortBy,
        sort_order: input.sortOrder,
      },
    });
  },
};

export default placementList;
