import type { ActionDefinition } from "@w6w/types";
import { ApifyClient, asJson, encodeId } from "../lib/client.ts";
import { datasetIdParam } from "../lib/params.ts";

/**
 * `POST /v2/datasets/{datasetId}/items` — append items to a dataset.
 *
 * Datasets are **append-only**: there is no update-item and no delete-item
 * endpoint in the API. So this is not idempotent — a retry appends a second
 * copy, and Apify offers no idempotency key to prevent it.
 *
 * ## Two documented refusals
 *
 * **5 MB per request.** Larger payloads must be split into several calls; the
 * request is refused, not truncated.
 *
 * **All-or-nothing validation.** If the dataset has a schema and *any* item
 * fails it, "the whole request is discarded" with a `400`. There is no partial
 * write to reconcile, which is the one good thing about it.
 *
 * The endpoint answers `201` with an empty object, so there is nothing useful to
 * return from the vendor; this action reports what it sent instead.
 */
interface Input {
  datasetId: string;
  items: unknown;
}

const datasetItemsPush: ActionDefinition<Input> = {
  key: "dataset-items-push",
  type: "perform",
  resource: "dataset",
  title: "Push Dataset Items",
  description: "Append one item or an array of items to a dataset.",
  idempotent: false,
  params: [
    datasetIdParam,
    {
      key: "items",
      label: "Items",
      type: "json",
      required: true,
      hint: "A single object or an array of objects. The whole request is rejected if any item " +
        "fails the dataset's schema, and the payload cannot exceed 5 MB.",
    },
  ],
  output: [
    { key: "datasetId", type: "string", label: "Dataset written to" },
    { key: "itemCount", type: "number", label: "Items sent in this call" },
    { key: "status", type: "number", label: "HTTP status" },
  ],

  async execute(input, ctx) {
    const items = asJson<unknown>(input.items, "Items");
    const count = Array.isArray(items) ? items.length : 1;
    const status = await new ApifyClient(ctx).status(
      `/datasets/${encodeId(input.datasetId)}/items`,
      { method: "POST", body: items },
    );
    ctx.log("info", "pushed dataset items", { datasetId: input.datasetId, itemCount: count });
    return { datasetId: input.datasetId, itemCount: count, status };
  },
};

export default datasetItemsPush;
