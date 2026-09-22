import type { ActionDefinition } from "@w6w/types";
import { compact, HubstaffClient } from "../lib/client.ts";
import { userIdParam } from "../lib/params.ts";

/**
 * `POST /v2/users/{user_id}/time_entries` — add time by hand.
 *
 * Body schema `postV2UsersUserIdTimeEntries`: `project_id`, `start_time`
 * (ISO 8601) and `tracked` (seconds) are required; `billable`, `note` and
 * `task_id` are optional.
 *
 * ## Why this is the *only* time-entry action in this build
 *
 * Hubstaff v2 has no read for time entries. The `time_entries` tag in the
 * OpenAPI document contains exactly one operation — this one — and the
 * organization-level reads that look like they should work on time entries
 * answer different questions: `GET /v2/organizations/{id}/timesheets` returns
 * "aggregate approval records … not individual time entries" (the vendor's own
 * wording) and `GET /v2/organizations/{id}/activities` returns 10-minute
 * tracked blocks. So a workflow that needs "the hours logged on project X"
 * reads timesheets or activities; there is no endpoint that lists the rows this
 * action creates.
 *
 * ## Two documented limits
 *
 * **A pending-approval project cannot be written to.** The vendor's note:
 * "Manual time entries that require approval cannot be added through the API."
 * The write is refused rather than queued for approval.
 *
 * **`note` is conditionally required.** The document's field description is
 * "(it's REQUIRED by default) Can be modified to be optional in the Require
 * Reason setting" — so whether this call needs a `note` depends on the
 * organization's settings, and a 400 naming `note` is that setting talking.
 *
 * The response carries no resource: the document declares `201` with no body
 * schema and the reference page says it "Returns `{success: true}` on success".
 *
 * Not idempotent: a retry logs the time twice.
 */
interface Input {
  user_id: number;
  project_id: number;
  start_time: string;
  tracked: number;
  note?: string;
  billable?: boolean;
  task_id?: number;
}

const action: ActionDefinition<Input> = {
  key: "time-entry-create",
  type: "perform",
  resource: "time-entry",
  title: "Create Time Entry",
  description: "Add a manual time entry for a member (POST /v2/users/{user_id}/time_entries).",
  idempotent: false,
  params: [
    userIdParam,
    {
      key: "project_id",
      label: "Project ID",
      type: "number",
      required: true,
      validation: { integer: true },
      hint: "The project the time is logged against.",
    },
    {
      key: "start_time",
      label: "Start time",
      type: "string",
      required: true,
      hint: "ISO 8601, e.g. `2026-09-22T09:00:00Z`.",
    },
    {
      key: "tracked",
      label: "Tracked (seconds)",
      type: "number",
      required: true,
      validation: { integer: true, min: 1 },
      hint: "The number of seconds tracked.",
    },
    {
      key: "note",
      label: "Note",
      type: "string",
      hint: "Required by default — the organization's 'Require Reason' setting can make it " +
        "optional.",
    },
    {
      key: "billable",
      label: "Billable",
      type: "boolean",
      hint: "Whether the time is billable. Defaults to the project's setting.",
      advanced: true,
    },
    {
      key: "task_id",
      label: "Task ID",
      type: "number",
      validation: { integer: true },
      hint: "Attach the entry to a task.",
      advanced: true,
    },
  ],
  output: [{ key: "success", type: "boolean", label: "True on success" }],

  execute(input, ctx) {
    return new HubstaffClient(ctx).request(`/users/${input.user_id}/time_entries`, {
      method: "POST",
      body: compact({
        project_id: input.project_id,
        start_time: input.start_time,
        tracked: input.tracked,
        note: input.note,
        billable: input.billable,
        task_id: input.task_id,
      }),
    });
  },
};

export default action;
