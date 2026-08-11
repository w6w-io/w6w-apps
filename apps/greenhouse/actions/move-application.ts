import type { ActionDefinition } from "@w6w/types";
import { encodeId, HarvestClient } from "../lib/client.ts";

/**
 * `POST /v3/applications/{id}/move` — advance a candidate, or transfer them to
 * another job.
 *
 * ## `from_stage_id` is a guard, not a description
 *
 * It is required, and it must match the stage the application is *currently*
 * sitting in. Greenhouse uses it as a compare-and-swap: if the candidate has
 * moved since the workflow read them, the move is refused instead of applied to
 * the wrong stage. That makes this action safe to run against stale data and
 * **not** safe to retry blindly — a second call after a successful move fails
 * validation, because the application is no longer in `from_stage_id`. Hence
 * `idempotent: false`: reporting it as retryable would turn one transient network
 * error into a confusing 422.
 *
 * ## Two destinations, exactly one of them
 *
 * `to_stage_id` moves within the same job; `to_job_id` transfers the application
 * onto a different job, where the candidate lands on that job's first interview
 * stage. Sending both is rejected here rather than at the server, since the
 * result of getting it wrong is a candidate on the wrong job.
 *
 * ## It sends e-mail
 *
 * A successful move fires the job's configured stage-transition rules, including
 * automated candidate e-mail. `email_from_user_id` picks the sender. This is not
 * a dry-run-able operation, which is worth knowing before wiring it behind a
 * trigger that might fire twice.
 *
 * Answers **204 with no body**, so there is no moved application to inspect —
 * read it back with `list-applications` if the new stage is needed.
 */
interface Input {
  applicationId: number;
  fromStageId: number;
  toStageId?: number;
  toJobId?: number;
  emailFromUserId?: number;
}

const moveApplication: ActionDefinition<Input> = {
  key: "move-application",
  type: "perform",
  resource: "application",
  title: "Move Application",
  description:
    "Move an application to another stage on the same job, or transfer it to a different job.",
  idempotent: false,
  params: [
    {
      key: "applicationId",
      label: "Application id",
      type: "number",
      required: true,
      validation: { integer: true, min: 1 },
    },
    {
      key: "fromStageId",
      label: "From stage id",
      type: "number",
      required: true,
      validation: { integer: true, min: 1 },
      hint: "Must be the stage the application is in RIGHT NOW — Greenhouse uses it to refuse " +
        "stale moves. Read it from List Application Stages with Current stage only turned on.",
    },
    {
      key: "toStageId",
      label: "To stage id",
      type: "number",
      validation: { integer: true, min: 1 },
      hint: "A stage on the SAME job, from List Job Interview Stages. Leave empty when " +
        "transferring to another job.",
    },
    {
      key: "toJobId",
      label: "Transfer to job id",
      type: "number",
      validation: { integer: true, min: 1 },
      hint: "Moves the application onto a different job, landing on that job's first stage. " +
        "Mutually exclusive with the stage above.",
    },
    {
      key: "emailFromUserId",
      label: "Send stage e-mail as user id",
      type: "number",
      validation: { integer: true, min: 1 },
      hint: "A move fires the job's stage-transition rules, which may send the candidate an " +
        "e-mail. This picks the sender.",
    },
  ],
  output: [{ key: "status", type: "number", label: "HTTP status — 204 on success, no body" }],

  async execute(input, ctx) {
    if (input.toStageId && input.toJobId) {
      throw new Error(
        "Choose one destination: a stage on the same job, or a different job to transfer to. " +
          "Greenhouse's move body accepts to_stage_id or to_job_id, not both.",
      );
    }
    if (!input.toStageId && !input.toJobId) {
      throw new Error("A destination is required — either a to-stage id or a transfer-to job id.");
    }

    const body: Record<string, unknown> = { from_stage_id: input.fromStageId };
    if (input.toStageId) body.to_stage_id = input.toStageId;
    if (input.toJobId) body.to_job_id = input.toJobId;
    if (input.emailFromUserId) body.email_from_user_id = input.emailFromUserId;

    ctx.log("info", "moving application", { applicationId: input.applicationId });
    const status = await new HarvestClient(ctx).status(
      `/applications/${encodeId(input.applicationId)}/move`,
      { method: "POST", body },
    );
    return { status };
  },
};

export default moveApplication;
