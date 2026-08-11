import type { ActionDefinition } from "@w6w/types";
import { ApifyClient, encodeId } from "../lib/client.ts";
import { runIdParam } from "../lib/params.ts";

/**
 * `GET /v2/actor-runs/{runId}` — the state of one run.
 *
 * This is the polling endpoint: call it until `status` is one of the terminal
 * values (`SUCCEEDED`, `FAILED`, `TIMED-OUT`, `ABORTED`), then read the run's
 * `defaultDatasetId`.
 *
 * ## Two things the vendor documents that are easy to miss
 *
 * **`waitForFinish` caps at 60 seconds**, and a run that has not finished by
 * then comes back with a transitional status rather than an error. It turns a
 * poll loop into a single call for short runs and nothing more.
 *
 * **The first response after completion can be wrong about money.** Apify's own
 * note: "the first response after completion can still show preliminary `stats`,
 * costs, and event counts. For stable figures, wait about 10 seconds and call
 * the endpoint again." So `usageTotalUsd` read the instant a run finishes is not
 * the number to bill against.
 *
 * The endpoint also works without a token — the run id is the capability — but
 * `usageUsd` and `usageTotalUsd` are hidden in that case. Requests from this app
 * are always signed, so those fields are present.
 */
interface Input {
  runId: string;
  waitForFinish?: number;
}

const runGet: ActionDefinition<Input> = {
  key: "run-get",
  type: "read",
  resource: "run",
  title: "Get Run",
  description: "Fetch one Actor run, optionally waiting up to 60 seconds for it to finish.",
  params: [
    runIdParam,
    {
      key: "waitForFinish",
      label: "Wait for finish (seconds)",
      type: "number",
      validation: { integer: true, min: 0, max: 60 },
      hint:
        "Hold the response until the run reaches a terminal status, up to 60 seconds (Apify's " +
        "ceiling). A run still going after that comes back with a transitional status, not an " +
        "error.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Run ID" },
    { key: "status", type: "string", label: "Run status" },
    { key: "statusMessage", type: "string", label: "Latest status message" },
    { key: "defaultDatasetId", type: "string", label: "Dataset holding the run's results" },
    { key: "defaultKeyValueStoreId", type: "string", label: "Store holding the run's OUTPUT" },
    { key: "stats", type: "object", label: "Run statistics" },
    { key: "usageTotalUsd", type: "number", label: "Total cost — preliminary right after finish" },
  ],

  execute(input, ctx) {
    return new ApifyClient(ctx).data(`/actor-runs/${encodeId(input.runId)}`, {
      query: { waitForFinish: input.waitForFinish },
    });
  },
};

export default runGet;
