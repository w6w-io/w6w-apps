import type { ActionDefinition } from "@w6w/types";
import { ApifyClient, type ApifyListPage, flag, toList } from "../lib/client.ts";
import { descParam, paginationParams, runStatusOptions } from "../lib/params.ts";

/**
 * `GET /v2/actor-runs` — every run in the account, across all Actors.
 *
 * The status filter takes one status or a comma-separated list. Note the
 * hyphens in `TIMING-OUT` and `TIMED-OUT`: they are hyphenated, unlike the
 * underscored webhook event types, and an underscored spelling here filters to
 * nothing rather than erroring.
 *
 * Runs are returned oldest-first by `startedAt`, which is what makes paging
 * safe while new runs are being created. "Newest first" is almost always what a
 * workflow actually wants.
 */
interface Input {
  status?: string[] | string;
  startedAfter?: string;
  startedBefore?: string;
  desc?: boolean;
  limit?: number;
  offset?: number;
}

const runList: ActionDefinition<Input> = {
  key: "run-list",
  type: "search",
  resource: "run",
  title: "List Runs",
  description: "List Actor runs across the account, optionally filtered by status and start date.",
  params: [
    {
      key: "status",
      label: "Status",
      type: "multiselect",
      options: runStatusOptions,
      hint: "Leave empty for every status.",
    },
    {
      key: "startedAfter",
      label: "Started after",
      type: "datetime",
      hint: "ISO 8601 UTC. Inclusive.",
    },
    {
      key: "startedBefore",
      label: "Started before",
      type: "datetime",
      hint: "ISO 8601 UTC. Inclusive.",
    },
    descParam,
    ...paginationParams(100, "Apify's own default and maximum is 1000; 100 is prefilled here."),
  ],
  output: [
    { key: "items", type: "array", label: "Runs" },
    { key: "total", type: "number", label: "Total matching runs" },
    { key: "count", type: "number", label: "Runs in this page" },
    { key: "offset", type: "number", label: "Offset of this page" },
  ],

  execute(input, ctx) {
    return new ApifyClient(ctx).data<ApifyListPage<unknown>>("/actor-runs", {
      query: {
        status: toList(input.status),
        startedAfter: input.startedAfter,
        startedBefore: input.startedBefore,
        desc: flag(input.desc),
        limit: input.limit,
        offset: input.offset,
      },
    });
  },
};

export default runList;
