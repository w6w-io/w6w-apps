import type { ActionDefinition } from "@w6w/types";
import { encodeId, HarvestClient } from "../lib/client.ts";

/**
 * `POST /v3/applications/{id}/hire` — mark an application hired and close the
 * opening it fills.
 *
 * This is two operations in one: the application's status becomes `hired`, and
 * the named opening on the job closes. That second half is why `opening_id`
 * matters — Greenhouse's own note is that it is "required when the job has more
 * than one open opening", because it cannot guess which of three headcount slots
 * the hire consumes. Get the ids from `list-openings` filtered to `open`.
 *
 * `close_reason_id` is the reason recorded against the opening, typically the
 * organisation's `Hire` reason rather than anything unusual.
 *
 * Answers **204 with no body**, and is emphatically not retryable: the second
 * call finds an application that is already hired and an opening that is already
 * closed.
 */
interface Input {
  applicationId: number;
  openingId?: number;
  startDate?: string;
  closeReasonId?: number;
}

const hireApplication: ActionDefinition<Input> = {
  key: "hire-application",
  type: "perform",
  resource: "application",
  title: "Hire Application",
  description: "Mark an application as hired and close the opening it fills.",
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
      key: "openingId",
      label: "Opening id",
      type: "number",
      validation: { integer: true, min: 1 },
      hint: "The numeric id of the opening this hire fills, from List Openings. Required " +
        "whenever the job has more than one open opening — Greenhouse cannot guess.",
    },
    {
      key: "startDate",
      label: "Start date",
      type: "datetime",
      hint: "The candidate's first day, recorded on the hire.",
    },
    {
      key: "closeReasonId",
      label: "Close reason id",
      type: "number",
      validation: { integer: true, min: 1 },
      hint: "Reason recorded against the closing opening — normally the organisation's `Hire` " +
        "reason, from List Close Reasons in Greenhouse.",
    },
  ],
  output: [{ key: "status", type: "number", label: "HTTP status — 204 on success, no body" }],

  async execute(input, ctx) {
    const body: Record<string, unknown> = {};
    if (input.openingId) body.opening_id = input.openingId;
    if (input.startDate) body.start_date = input.startDate;
    if (input.closeReasonId) body.close_reason_id = input.closeReasonId;

    ctx.log("info", "hiring application", { applicationId: input.applicationId });
    const status = await new HarvestClient(ctx).status(
      `/applications/${encodeId(input.applicationId)}/hire`,
      { method: "POST", body },
    );
    return { status };
  },
};

export default hireApplication;
