import type { ActionDefinition } from "@w6w/types";
import { ApifyClient, asOptionalJson, encodeId, flag } from "../lib/client.ts";
import {
  datasetItemParams,
  type DatasetItemShaping,
  type RunOptionInput,
  runOptionParams,
  runOptionQuery,
  taskIdParam,
} from "../lib/params.ts";

/**
 * `POST /v2/actor-tasks/{actorTaskId}/run-sync-get-dataset-items` — run a task
 * and return its results in the same call.
 *
 * Same three caveats as the Actor equivalent: the response is a bare JSON array
 * with no `data` envelope, the status is `201`, and the run must finish inside
 * 300 seconds or the request answers `408` with no handle on the run it started.
 *
 * The input override merges over the task's stored input property by property,
 * exactly as in Run Task.
 *
 * Not idempotent: each call starts and bills a new run, and there is no
 * idempotency key on any Apify run endpoint.
 */
interface Input extends RunOptionInput, DatasetItemShaping {
  taskId: string;
  input?: unknown;
  limit?: number;
  offset?: number;
  desc?: boolean;
}

const taskRunSyncGetItems: ActionDefinition<Input> = {
  key: "task-run-sync-get-items",
  type: "perform",
  resource: "run",
  title: "Run Task and Get Items",
  description:
    "Run an Actor task, wait for it to finish (up to 300 seconds) and return its dataset items.",
  idempotent: false,
  params: [
    taskIdParam,
    {
      key: "input",
      label: "Input overrides",
      type: "json",
      hint: "Merged over the task's stored input, property by property.",
    },
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
    { key: "desc", label: "Newest first", type: "boolean" },
    ...datasetItemParams(),
    ...runOptionParams(),
  ],
  output: [{ key: "items", type: "array", label: "Dataset items" }],

  async execute(input, ctx) {
    ctx.log("info", "running task synchronously", { taskId: input.taskId });
    const overrides = asOptionalJson<Record<string, unknown>>(input.input, "Input overrides");
    const items = await new ApifyClient(ctx).json<unknown[]>(
      `/actor-tasks/${encodeId(input.taskId)}/run-sync-get-dataset-items`,
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
        ...(overrides === undefined ? {} : { body: overrides }),
      },
    );
    return { items: items ?? [] };
  },
};

export default taskRunSyncGetItems;
