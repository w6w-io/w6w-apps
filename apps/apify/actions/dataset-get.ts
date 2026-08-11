import type { ActionDefinition } from "@w6w/types";
import { ApifyClient, encodeId, stripSecrets } from "../lib/client.ts";
import { datasetIdParam } from "../lib/params.ts";

/**
 * `GET /v2/datasets/{datasetId}` — one dataset's metadata.
 *
 * `itemCount` and `cleanItemCount` are the useful pair: the second excludes
 * empty items and hidden fields, so a crawl that "returned 10,000 rows" may have
 * produced far fewer usable ones.
 *
 * ## One field is removed from the response
 *
 * The `Dataset` schema carries **`urlSigningSecretKey`**, the HMAC key that
 * mints signed public URLs for this dataset's contents. It is a live credential:
 * anyone holding it can hand out readable links to private scraped data. A
 * workflow step's result is persisted in the run record and routinely echoed
 * into logs and previews, so returning it would turn a metadata read into a
 * durable credential leak.
 *
 * It is deleted, not masked — see `REDACTED_FIELDS` in `lib/client.ts`. The
 * value is still visible to its owner in Apify Console. Nothing else about the
 * response is altered.
 */
interface Input {
  datasetId: string;
}

const datasetGet: ActionDefinition<Input> = {
  key: "dataset-get",
  type: "read",
  resource: "dataset",
  title: "Get Dataset",
  description:
    "Fetch one dataset's metadata and item counts. The URL-signing secret is removed from the " +
    "response.",
  params: [datasetIdParam],
  output: [
    { key: "id", type: "string", label: "Dataset ID" },
    { key: "name", type: "string", label: "Name — absent for a run's own dataset" },
    { key: "itemCount", type: "number", label: "Items stored" },
    { key: "cleanItemCount", type: "number", label: "Items excluding empty ones" },
  ],

  async execute(input, ctx) {
    const dataset = await new ApifyClient(ctx).data<Record<string, unknown>>(
      `/datasets/${encodeId(input.datasetId)}`,
    );
    return stripSecrets(dataset);
  },
};

export default datasetGet;
