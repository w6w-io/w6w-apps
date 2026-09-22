import type { ActionDefinition } from "@w6w/types";
import { compact, HubstaffClient } from "../lib/client.ts";
import { timesheetIdParam } from "../lib/params.ts";

/**
 * `PUT /v2/timesheets/{timesheet_id}` — move a timesheet through its approval
 * states.
 *
 * Body schema `putV2TimesheetsTimesheetId`: `status` (`open`, `submitted`,
 * `approved`, `denied`) is the only required field; `denial_reason`,
 * `confirm_pending_manual_time_request_denial` and
 * `acknowledge_pending_time_off_requests` are conditional.
 *
 * ## The two confirmations are the interesting part
 *
 * The vendor's operation note: approving a timesheet can require "explicit
 * confirmation when the period has pending …". Both flags exist because
 * approving a period silently resolves the things pending inside it:
 *
 *  - `confirm_pending_manual_time_request_denial` — "Required to approve a
 *    timesheet with pending manual time requests that will be denied."
 *  - `acknowledge_pending_time_off_requests` — "Required to approve a timesheet
 *    with pending time off requests in the same period."
 *
 * So an approve that is refused is not necessarily a permission problem: the
 * response names which confirmation is missing, and the flags are the answer.
 *
 * ## `denial_reason` is required to deny
 *
 * "A denial_reason is required when transitioning a timesheet to denied."
 *
 * Idempotent: Hubstaff has no idempotency key here, but this is a PUT of an
 * absolute status — repeating it lands the timesheet in the same state rather
 * than producing a second record, which is what the flag is about.
 */
interface Input {
  timesheet_id: number;
  status: string;
  denial_reason?: string;
  confirm_pending_manual_time_request_denial?: boolean;
  acknowledge_pending_time_off_requests?: boolean;
}

const action: ActionDefinition<Input> = {
  key: "timesheet-update-status",
  type: "perform",
  resource: "timesheet",
  title: "Update Timesheet Status",
  description: "Set a timesheet's approval status (PUT /v2/timesheets/{timesheet_id}).",
  idempotent: true,
  params: [
    timesheetIdParam,
    {
      key: "status",
      label: "Status",
      type: "select",
      required: true,
      options: [
        { value: "open", label: "Open" },
        { value: "submitted", label: "Submitted" },
        { value: "approved", label: "Approved" },
        { value: "denied", label: "Denied" },
      ],
    },
    {
      key: "denial_reason",
      label: "Denial reason",
      type: "string",
      hint: "Required when setting the status to `denied`.",
    },
    {
      key: "confirm_pending_manual_time_request_denial",
      label: "Confirm pending manual time request denials",
      type: "boolean",
      hint: "Required to approve a timesheet whose pending manual time requests will be denied.",
      advanced: true,
    },
    {
      key: "acknowledge_pending_time_off_requests",
      label: "Acknowledge pending time off requests",
      type: "boolean",
      hint: "Required to approve a timesheet with pending time off requests in the same period.",
      advanced: true,
    },
  ],
  output: [{ key: "timesheet", type: "object", label: "The updated timesheet" }],

  execute(input, ctx) {
    return new HubstaffClient(ctx).request(`/timesheets/${input.timesheet_id}`, {
      method: "PUT",
      body: compact({
        status: input.status,
        denial_reason: input.denial_reason,
        confirm_pending_manual_time_request_denial:
          input.confirm_pending_manual_time_request_denial,
        acknowledge_pending_time_off_requests: input.acknowledge_pending_time_off_requests,
      }),
    });
  },
};

export default action;
