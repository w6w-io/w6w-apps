import type { ActionDefinition } from "@w6w/types";
import { ApifyClient, asOptionalJson, encodeId, flag } from "../lib/client.ts";
import {
  actorIdParam,
  actorInputParam,
  datasetItemParams,
  type DatasetItemShaping,
  type RunOptionInput,
  runOptionParams,
  runOptionQuery,
} from "../lib/params.ts";

/**
 * `POST /v2/actors/{actorId}/run-sync-get-dataset-items` — run an Actor and
 * return its results in the same call.
 *
 * ## Three things that bite
 *
 * **The response is a bare JSON array.** Not `{"data": …}`. This is one of the
 * vendor's explicitly documented envelope exceptions, and it is why this action
 * calls the client's `json()` rather than `data()`.
 *
 * **It answers `201`, not `200`.** Both the async and the sync run endpoints
 * do.
 *
 * **300 seconds and then `408`.** If the run outlives that, the request times
 * out and you get nothing back about the run — not even its id, so there is no
 * handle to poll and no way to collect the results afterwards without going
 * hunting in List Runs. Anything that might be slow belongs in Run Actor plus
 * Get Dataset Items instead. Apify's own note is blunter still: an idle HTTP
 * connection may not survive five minutes of client or network conditions
 * either.
 *
 * Not idempotent: like every Apify run endpoint, each call starts and bills a
 * new run, and there is no idempotency key.
 */
interface Input extends RunOptionInput, DatasetItemShaping {
  actorId: string;
  input?: unknown;
  limit?: number;
  offset?: number;
  desc?: boolean;
}

const actorRunSyncGetItems: ActionDefinition<Input> = {
  key: "actor-run-sync-get-items",
  type: "perform",
  resource: "run",
  title: "Run Actor and Get Items",
  description:
    "Run an Actor, wait for it to finish (up to 300 seconds) and return its dataset items.",
  idempotent: false,
  params: [
    actorIdParam,
    actorInputParam,
    {
      key: "limit",
      label: "Limit",
      type: "number",
      default: 100,
      validation: { integer: true, min: 1 },
      hint: "Apify applies no limit by default, so a productive Actor can return a very large " +
        "response. 100 is prefilled here; raise it deliberately.",
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
      hint: "Items are returned in the order the Actor stored them unless this is on.",
    },
    ...datasetItemParams(),
    ...runOptionParams(),
  ],
  output: [{ key: "items", type: "array", label: "Dataset items" }],

  async execute(input, ctx) {
    ctx.log("info", "running Actor synchronously", { actorId: input.actorId });
    const items = await new ApifyClient(ctx).json<unknown[]>(
      `/actors/${encodeId(input.actorId)}/run-sync-get-dataset-items`,
      {
        method: "POST",
        query: {
          ...runOptionQuery(input),
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
        body: asOptionalJson(input.input, "Actor input") ?? {},
      },
    );
    // The endpoint answers a bare array; it is wrapped so the action's output
    // is an object with a named field, like every other action here.
    return { items: items ?? [] };
  },
};

export default actorRunSyncGetItems;
