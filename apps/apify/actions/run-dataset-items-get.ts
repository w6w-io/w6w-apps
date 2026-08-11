import type { ActionDefinition } from "@w6w/types";
import { ApifyClient, encodeId, flag } from "../lib/client.ts";
import { datasetItemParams, type DatasetItemShaping, runIdParam } from "../lib/params.ts";

/**
 * `GET /v2/actor-runs/{runId}/dataset/items` — the results of one run.
 *
 * A convenience route for the run's *default* dataset, so a workflow that has a
 * run id does not need to read the run object first to learn its
 * `defaultDatasetId`. Identical in behaviour to Get Dataset Items otherwise,
 * including the bare-array response.
 *
 * The default limit is this app's, not Apify's: the vendor applies no limit at
 * all here, and a productive scraper's default dataset can hold hundreds of
 * thousands of items.
 */
interface Input extends DatasetItemShaping {
  runId: string;
  limit?: number;
  offset?: number;
  desc?: boolean;
}

const runDatasetItemsGet: ActionDefinition<Input> = {
  key: "run-dataset-items-get",
  type: "read",
  resource: "dataset",
  title: "Get Run Results",
  description: "Read the items in an Actor run's default dataset.",
  params: [
    runIdParam,
    {
      key: "limit",
      label: "Limit",
      type: "number",
      default: 100,
      validation: { integer: true, min: 1 },
      hint: "Apify applies no limit by default. 100 is prefilled here; raise it deliberately.",
    },
    {
      key: "offset",
      label: "Offset",
      type: "number",
      validation: { integer: true, min: 0 },
    },
    {
      key: "desc",
      label: "Newest first",
      type: "boolean",
      hint: "Items come back in the order the Actor stored them unless this is on.",
    },
    ...datasetItemParams(),
  ],
  output: [{ key: "items", type: "array", label: "Dataset items" }],

  async execute(input, ctx) {
    const items = await new ApifyClient(ctx).json<unknown[]>(
      `/actor-runs/${encodeId(input.runId)}/dataset/items`,
      {
        query: {
          limit: input.limit,
          offset: input.offset,
          desc: flag(input.desc),
          clean: flag(input.clean),
          fields: input.fields,
          omit: input.omit,
          unwind: input.unwind,
          flatten: input.flatten,
          skipEmpty: flag(input.skipEmpty),
          skipHidden: flag(input.skipHidden),
          view: input.view,
        },
      },
    );
    // Bare array on the wire — see lib/client.ts, "Three response shapes".
    return { items: items ?? [] };
  },
};

export default runDatasetItemsGet;
