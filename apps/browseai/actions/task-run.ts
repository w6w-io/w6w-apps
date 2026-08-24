import type { ActionDefinition } from "@w6w/types";
import { asOptionalJson, BrowseAiClient } from "../lib/client.ts";
import { inputParametersParam, robotIdParam } from "../lib/params.ts";

/**
 * `POST /v2/robots/{robotId}/tasks` — run a robot on demand.
 *
 * ## Not idempotent, and there is no idempotency key
 *
 * Browse AI's task-creation endpoint accepts no idempotency key of any kind —
 * unlike Apify's Create Webhook, nothing in this whole API does. Every call
 * starts a new, separately-billed task, so a retry duplicates work and cost.
 * `idempotent` is `false` and the runtime must never retry this on its own.
 *
 * ## The response is a *live* task, not always a finished one
 *
 * Fast robots often finish before the HTTP response even returns, but nothing
 * about this call blocks until completion. `status` on the returned task tells
 * you whether it already finished (`successful`/`failed`) or is still
 * `in-progress` — poll `task-get` in the latter case, or register a
 * `taskFinished` webhook to be notified instead of polling.
 *
 * ## Failure modes worth distinguishing
 *
 * `403 credits_limit_reached` means the team is out of task-run credits for
 * this billing period — retrying will not help. `503 robot_under_maintenance`
 * means the robot is mid-training/mid-update and cannot run right now — this
 * one usually clears on its own within minutes. Both surface with their vendor
 * code intact via `formatBrowseAiError` rather than as a bare 403/503.
 */
interface Input {
  robotId: string;
  inputParameters?: unknown;
  recordVideo?: boolean;
}

interface Output {
  id: string;
  status?: string;
  robotId: string;
  createdAt: number;
  startedAt?: number | null;
  finishedAt?: number | null;
}

const taskRun: ActionDefinition<Input, Output> = {
  key: "task-run",
  type: "perform",
  resource: "task",
  title: "Run Robot",
  description: "Run a robot on-demand with custom input parameters.",
  idempotent: false,
  params: [
    robotIdParam,
    inputParametersParam,
    {
      key: "recordVideo",
      label: "Record video",
      type: "boolean",
      hint:
        "Try to record a video while running the task. Not guaranteed — the robot may skip video " +
        "recording if the site is too heavy.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Task ID" },
    { key: "status", type: "string", label: "Task status" },
    { key: "robotId", type: "string", label: "Robot ID" },
    { key: "createdAt", type: "number", label: "Created at" },
  ],

  async execute(input, ctx) {
    ctx.log("info", "running robot", { robotId: input.robotId });
    const inputParameters = asOptionalJson(input.inputParameters, "Input parameters");
    const body = await new BrowseAiClient(ctx).request<{ result: Output }>(
      `/robots/${encodeURIComponent(input.robotId)}/tasks`,
      {
        method: "POST",
        body: { recordVideo: input.recordVideo, inputParameters },
      },
    );
    return body.result;
  },
};

export default taskRun;
