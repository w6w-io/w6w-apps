import type { ActionDefinition } from "@w6w/types";
import { ApifyClient, encodeId, flag } from "../lib/client.ts";
import { runIdParam } from "../lib/params.ts";

/**
 * `POST /v2/actor-runs/{runId}/abort` — stop a run.
 *
 * Idempotent, and the vendor says so directly: "Only runs that are starting or
 * running are aborted. For runs with status `FINISHED`, `FAILED`, `ABORTING` and
 * `TIMED-OUT` this call does nothing." A retry re-reads a run that is already
 * stopped and returns it. That is the honest reading of `idempotent: true` — the
 * end state is the same however many times it runs.
 *
 * `gracefully` sends the run an `aborting` and a `persistState` event and gives
 * it 30 seconds before force-stopping. Use it when the run will be resurrected:
 * a run aborted the hard way resumes from whatever state it last persisted on
 * its own.
 */
interface Input {
  runId: string;
  gracefully?: boolean;
}

const runAbort: ActionDefinition<Input> = {
  key: "run-abort",
  type: "perform",
  resource: "run",
  title: "Abort Run",
  description: "Stop a starting or running Actor run. Does nothing to an already-finished run.",
  idempotent: true,
  params: [
    runIdParam,
    {
      key: "gracefully",
      label: "Abort gracefully",
      type: "boolean",
      hint:
        "Give the run 30 seconds to persist its state before force-stopping it. Worth it if you " +
        "intend to resurrect the run later.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Run ID" },
    { key: "status", type: "string", label: "Run status after the call" },
  ],

  execute(input, ctx) {
    return new ApifyClient(ctx).data(`/actor-runs/${encodeId(input.runId)}/abort`, {
      method: "POST",
      query: { gracefully: flag(input.gracefully) },
    });
  },
};

export default runAbort;
