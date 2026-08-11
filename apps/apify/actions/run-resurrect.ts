import type { ActionDefinition } from "@w6w/types";
import { ApifyClient, encodeId } from "../lib/client.ts";
import { runIdParam } from "../lib/params.ts";

/**
 * `POST /v2/actor-runs/{runId}/resurrect` — restart a finished run.
 *
 * Only `FINISHED`, `FAILED`, `ABORTED` and `TIMED-OUT` runs can be resurrected.
 * The run's status flips back to `RUNNING` and its container restarts against
 * **the same storages** — the same dataset, the same key-value store, the same
 * request queue — which is the whole point: a crawl that died three quarters of
 * the way through continues rather than starting over.
 *
 * That shared-storage behaviour is also why this is not idempotent: a second
 * resurrection of a run that is now `RUNNING` is rejected, and a successful one
 * appends more items to a dataset a previous step may already have read.
 *
 * The `build` override exists because "the same build" is ambiguous over time. A
 * run first started against the `latest` tag resurrects against whatever
 * `latest` resolved to *then*, not what it points at now. Name a build here to
 * force the current one.
 */
interface Input {
  runId: string;
  build?: string;
}

const runResurrect: ActionDefinition<Input> = {
  key: "run-resurrect",
  type: "perform",
  resource: "run",
  title: "Resurrect Run",
  description:
    "Restart a finished, failed, aborted or timed-out run against its existing storages.",
  idempotent: false,
  params: [
    runIdParam,
    {
      key: "build",
      label: "Build",
      type: "string",
      hint: "Build tag or number to resurrect against. Defaults to the exact build the run " +
        "originally used, which for a run started from `latest` is what `latest` meant then, " +
        "not now.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Run ID" },
    { key: "status", type: "string", label: "Run status after the call" },
  ],

  execute(input, ctx) {
    return new ApifyClient(ctx).data(`/actor-runs/${encodeId(input.runId)}/resurrect`, {
      method: "POST",
      query: { build: input.build },
    });
  },
};

export default runResurrect;
