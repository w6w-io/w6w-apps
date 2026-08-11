import type { ActionDefinition } from "@w6w/types";
import { eq, joinFilters, KeapClient, nextPageToken, V2 } from "../lib/client.ts";
import { filterParam, pageParams } from "../lib/params.ts";

/**
 * `GET /rest/v2/opportunities/stages` — List of Opportunity Stages.
 *
 * The lookup Create Opportunity depends on, since `stage_id` is required there
 * and Keap publishes no default.
 *
 * `order_by` accepts exactly one field — `stage_order` — so it is offered as a
 * direction toggle rather than a free-text sort, and the response key is
 * `stages`, not `opportunity_stages`.
 */
interface Input {
  name?: string;
  filter?: string;
  direction?: string;
  pageSize?: number;
  pageToken?: string;
}

const opportunityStageList: ActionDefinition<Input> = {
  key: "opportunity-stage-list",
  type: "read",
  title: "List Opportunity Stages",
  resource: "opportunity",
  description: "List the pipeline stages, in pipeline order.",
  params: [
    {
      key: "name",
      label: "Stage name starts with",
      type: "string",
      hint: "Supports a trailing `*` for prefix matching.",
    },
    filterParam,
    {
      key: "direction",
      label: "Order",
      type: "select",
      default: "asc",
      options: [
        { value: "asc", label: "Pipeline order" },
        { value: "desc", label: "Reverse pipeline order" },
      ],
      hint: "`stage_order` is the only sort field Keap accepts here.",
    },
    ...pageParams(),
  ],
  output: [
    { key: "stages", type: "array", label: "Stages" },
    { key: "count", type: "number", label: "Stages returned" },
    { key: "nextPageToken", type: "string", label: "Next page token" },
  ],

  async execute(input, ctx) {
    const filter = joinFilters([eq("opportunity_stage_name", input.name), input.filter]);
    const client = new KeapClient(ctx);
    const body = await client.json<{ stages?: unknown[]; next_page_token?: string }>(
      `${V2}/opportunities/stages`,
      {
        query: {
          filter,
          order_by: `stage_order ${input.direction || "asc"}`,
          page_size: input.pageSize,
          page_token: input.pageToken,
        },
      },
    );
    const stages = body?.stages ?? [];
    return { stages, count: stages.length, nextPageToken: nextPageToken(body) };
  },
};

export default opportunityStageList;
