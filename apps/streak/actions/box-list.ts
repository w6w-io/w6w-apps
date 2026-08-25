import type { ActionDefinition } from "@w6w/types";
import { encodeId, StreakClient } from "../lib/client.ts";
import { pipelineKeyParam } from "../lib/params.ts";

/**
 * `GET /pipelines/{pipelineKey}/boxes` — every box (record) in a pipeline,
 * as a bare array.
 *
 * The `page` parameter's own description promises "If there are more
 * results to show, `hasNextPage` will be `true`" — but the response is a
 * bare JSON array with no such field anywhere in it, and none of this app's
 * other list endpoints carry one either. There is no documented way to know
 * a page is the last one except that it came back shorter than `limit`
 * (or empty), so that is what a caller has to check.
 */
interface Input {
  pipelineKey: string;
  sortBy?: string;
  stageKey?: string;
  page?: number;
  limit?: number;
}

const boxList: ActionDefinition<Input> = {
  key: "box-list",
  type: "search",
  resource: "box",
  title: "List Boxes",
  description: "List boxes (records) in a pipeline, optionally filtered to one stage.",
  params: [
    pipelineKeyParam,
    {
      key: "stageKey",
      label: "Stage Key",
      type: "string",
      hint: "Limit the list to boxes currently in this stage.",
    },
    {
      key: "sortBy",
      label: "Sort By",
      type: "select",
      advanced: true,
      options: [
        { value: "creationTimestamp", label: "Creation date" },
        { value: "lastUpdatedTimestamp", label: "Last updated" },
      ],
    },
    {
      key: "page",
      label: "Page",
      type: "number",
      default: 0,
      advanced: true,
      hint: "0-indexed. Streak documents no 'has more' flag in the response — a page shorter " +
        "than Limit (or empty) means you've reached the end.",
    },
    { key: "limit", label: "Limit", type: "number", advanced: true },
  ],
  output: [{ key: "results", type: "array", label: "Boxes" }],

  async execute(input, ctx) {
    const results = await new StreakClient(ctx).get<unknown[]>(
      `/pipelines/${encodeId(input.pipelineKey)}/boxes`,
      {
        sortBy: input.sortBy,
        stageKey: input.stageKey,
        page: input.page,
        limit: input.limit,
      },
    );
    return { results: results ?? [] };
  },
};

export default boxList;
