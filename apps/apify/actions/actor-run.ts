import type { ActionDefinition } from "@w6w/types";
import { ApifyClient, asOptionalJson, encodeId } from "../lib/client.ts";
import {
  actorIdParam,
  actorInputParam,
  type RunOptionInput,
  runOptionParams,
  runOptionQuery,
} from "../lib/params.ts";

/**
 * `POST /v2/actors/{actorId}/runs` — start an Actor and return immediately.
 *
 * ## Not idempotent, and there is no idempotency key
 *
 * Apify's run endpoints accept no idempotency key of any kind — the only
 * endpoint in this app's surface that does is Create Webhook. Every call starts
 * a new, separately-billed run. A retry therefore duplicates work and cost,
 * which is why `idempotent` is `false` and why the runtime must never retry this
 * on its own.
 *
 * ## The response is a *starting* run, not a result
 *
 * You get the run object with `status: "READY"` and, importantly,
 * `defaultDatasetId` / `defaultKeyValueStoreId` already populated. The normal
 * workflow shape is: run here, then poll Get Run until the status is terminal,
 * then read Get Dataset Items against `defaultDatasetId`.
 *
 * `waitForFinish` lets the API hold the connection for up to 60 seconds, which
 * is enough for a fast Actor and turns the three steps into one. It is capped at
 * 60 by Apify; for longer runs use Run Actor and Get Dataset Items (up to 300
 * seconds) or poll.
 */
interface Input extends RunOptionInput {
  actorId: string;
  input?: unknown;
  waitForFinish?: number;
}

const actorRun: ActionDefinition<Input> = {
  key: "actor-run",
  type: "perform",
  resource: "run",
  title: "Run Actor",
  description:
    "Start an Actor run and return the run object immediately, without waiting for it to finish.",
  idempotent: false,
  params: [
    actorIdParam,
    actorInputParam,
    {
      key: "waitForFinish",
      label: "Wait for finish (seconds)",
      type: "number",
      validation: { integer: true, min: 0, max: 60 },
      hint:
        "Hold the response until the run finishes, up to 60 seconds (Apify's ceiling). The run " +
        "keeps going regardless; only the response is affected, and a run that has not finished " +
        "in time comes back with a transitional status.",
    },
    ...runOptionParams(),
  ],
  output: [
    { key: "id", type: "string", label: "Run ID" },
    { key: "status", type: "string", label: "Run status" },
    { key: "defaultDatasetId", type: "string", label: "Dataset holding the run's results" },
    { key: "defaultKeyValueStoreId", type: "string", label: "Store holding the run's OUTPUT" },
    { key: "startedAt", type: "string", label: "Start time" },
  ],

  execute(input, ctx) {
    ctx.log("info", "starting Actor run", { actorId: input.actorId });
    return new ApifyClient(ctx).data(`/actors/${encodeId(input.actorId)}/runs`, {
      method: "POST",
      query: { ...runOptionQuery(input), waitForFinish: input.waitForFinish },
      // Apify passes the body through verbatim as the Actor's INPUT record. An
      // empty object is sent when the caller supplies nothing, because the
      // endpoint's documented content type is application/json.
      body: asOptionalJson(input.input, "Actor input") ?? {},
    });
  },
};

export default actorRun;
