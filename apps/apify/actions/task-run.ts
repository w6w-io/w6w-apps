import type { ActionDefinition } from "@w6w/types";
import { ApifyClient, asOptionalJson, encodeId } from "../lib/client.ts";
import {
  type RunOptionInput,
  runOptionParams,
  runOptionQuery,
  taskIdParam,
} from "../lib/params.ts";

/**
 * `POST /v2/actor-tasks/{actorTaskId}/runs` — start a task and return
 * immediately.
 *
 * ## The input override is a *merge*, not a replacement
 *
 * The vendor is explicit: "if the object in the POST payload does not define a
 * particular input property, the Actor run uses the default value defined by the
 * task (or Actor's input schema if not defined by the task)". So sending
 * `{"maxItems": 5}` overrides that one property and leaves the task's stored
 * input otherwise intact — which is the useful behaviour, and the opposite of
 * what "override the input" usually means.
 *
 * ## Running a task with a scoped token needs two permissions
 *
 * Apify has no dedicated "run" permission on a task. A scoped token needs
 * **Run** on the *Actor* the task executes and **Read** on the task itself.
 * A token granted only one of the two fails with `insufficient-permissions`,
 * which the client surfaces verbatim.
 *
 * Not idempotent: every call starts and bills a new run, and Apify's run
 * endpoints accept no idempotency key.
 */
interface Input extends RunOptionInput {
  taskId: string;
  input?: unknown;
  waitForFinish?: number;
}

const taskRun: ActionDefinition<Input> = {
  key: "task-run",
  type: "perform",
  resource: "run",
  title: "Run Task",
  description: "Start an Actor task run and return the run object without waiting for it.",
  idempotent: false,
  params: [
    taskIdParam,
    {
      key: "input",
      label: "Input overrides",
      type: "json",
      hint: "Merged over the task's stored input, property by property. Anything not named here " +
        "keeps the task's own value.",
    },
    {
      key: "waitForFinish",
      label: "Wait for finish (seconds)",
      type: "number",
      validation: { integer: true, min: 0, max: 60 },
      hint: "Hold the response until the run finishes, up to 60 seconds (Apify's ceiling).",
    },
    ...runOptionParams(),
  ],
  output: [
    { key: "id", type: "string", label: "Run ID" },
    { key: "status", type: "string", label: "Run status" },
    { key: "defaultDatasetId", type: "string", label: "Dataset holding the run's results" },
    { key: "defaultKeyValueStoreId", type: "string", label: "Store holding the run's OUTPUT" },
  ],

  execute(input, ctx) {
    ctx.log("info", "starting task run", { taskId: input.taskId });
    const overrides = asOptionalJson<Record<string, unknown>>(input.input, "Input overrides");
    return new ApifyClient(ctx).data(`/actor-tasks/${encodeId(input.taskId)}/runs`, {
      method: "POST",
      query: { ...runOptionQuery(input), waitForFinish: input.waitForFinish },
      // Omitted entirely when there is nothing to override, so the task's own
      // stored input is used untouched.
      ...(overrides === undefined ? {} : { body: overrides }),
    });
  },
};

export default taskRun;
