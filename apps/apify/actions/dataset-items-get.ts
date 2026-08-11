import type { ActionDefinition } from "@w6w/types";
import { ApifyClient, encodeId, flag } from "../lib/client.ts";
import { datasetIdParam, datasetItemParams, type DatasetItemShaping } from "../lib/params.ts";

/**
 * `GET /v2/datasets/{datasetId}/items` — read a dataset.
 *
 * ## Bare array, no envelope
 *
 * One of the vendor's three documented exceptions to the `{"data": …}` rule: the
 * body *is* the array of items. Paging metadata is not in the body at all; it is
 * in the `X-Apify-Pagination-Total` / `-Offset` / `-Count` / `-Limit` response
 * headers, and the endpoint's CORS policy exposes exactly those. This action
 * returns the items; use Get Dataset for `itemCount` when you need the total.
 *
 * ## `limit` is unbounded on Apify's side
 *
 * Every other list endpoint caps at 1,000. This one has no default limit at all,
 * so a scraper's dataset comes back whole. 100 is prefilled here for that
 * reason.
 *
 * ## Only the JSON projection is exposed
 *
 * The endpoint also serves CSV, XLSX, HTML, XML and RSS. An Action hands
 * structured data to the next workflow step, not a file, and an XLSX workbook
 * has no meaningful JSON projection — so `format` is pinned to the vendor's own
 * default of `json`.
 */
interface Input extends DatasetItemShaping {
  datasetId: string;
  limit?: number;
  offset?: number;
  desc?: boolean;
}

const datasetItemsGet: ActionDefinition<Input> = {
  key: "dataset-items-get",
  type: "read",
  resource: "dataset",
  title: "Get Dataset Items",
  description: "Read items from a dataset, with optional field selection and reshaping.",
  params: [
    datasetIdParam,
    {
      key: "limit",
      label: "Limit",
      type: "number",
      default: 100,
      validation: { integer: true, min: 1 },
      hint: "Apify applies no limit to this endpoint at all — a full dataset comes back. 100 is " +
        "prefilled here; raise it deliberately.",
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
      hint: "Items come back in the order they were stored unless this is on.",
    },
    ...datasetItemParams(),
  ],
  output: [{ key: "items", type: "array", label: "Dataset items" }],

  async execute(input, ctx) {
    const items = await new ApifyClient(ctx).json<unknown[]>(
      `/datasets/${encodeId(input.datasetId)}/items`,
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
    return { items: items ?? [] };
  },
};

export default datasetItemsGet;
