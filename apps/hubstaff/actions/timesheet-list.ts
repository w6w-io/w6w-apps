import type { ActionDefinition } from "@w6w/types";
import { HubstaffClient } from "../lib/client.ts";
import { csvParam, organizationIdParam, paginationParams } from "../lib/params.ts";

/**
 * `GET /v2/organizations/{organization_id}/timesheets` — the organization's
 * timesheets.
 *
 * Returns `{"timesheets": [{...Timesheet}]}` plus the cursor envelope. A row
 * carries `user_id`, `status`, `tracked` and `input_tracked` (seconds),
 * `keyboard` / `mouse` / `overall` (percentages), `start_date` / `stop_date`,
 * `submitted_on`, `approved_on`, `approved_by_id`, `denial_reason`, `paid`,
 * `locked`, and the `team_payment_id` / `team_invoice_id` invoice links.
 *
 * ## A timesheet is an approval record, not a list of time entries
 *
 * The vendor's own note on this operation: "Timesheets are aggregate records
 * used by the timesheet approval system, not individual time entries." There is
 * no endpoint in v2 that lists the individual entries behind one — that detail
 * lives in `activity-list`'s 10-minute blocks.
 *
 * ## The date filters do not mean the same thing
 *
 * `date[start]`/`date[stop]` bound the **timesheet period** (`stop` is
 * inclusive), while `approved[start]` selects approvals made *since* an instant
 * in UTC. They are independent axes and combine, so "approved last week for the
 * week before" is `approved[start]` plus `date[start]`/`date[stop]`.
 */
interface Input {
  organization_id: number;
  status?: string;
  date_start?: string;
  date_stop?: string;
  approved_start?: string;
  include?: string;
  page_start_id?: number;
  page_limit?: number;
}

const action: ActionDefinition<Input> = {
  key: "timesheet-list",
  type: "read",
  resource: "timesheet",
  title: "List Timesheets",
  description:
    "List an organization's timesheets (GET /v2/organizations/{organization_id}/timesheets).",
  params: [
    organizationIdParam,
    {
      key: "status",
      label: "Status",
      type: "select",
      hint: "Filter by approval status.",
      options: [
        { value: "open", label: "Open" },
        { value: "submitted", label: "Submitted" },
        { value: "approved", label: "Approved" },
        { value: "denied", label: "Denied" },
      ],
    },
    {
      key: "date_start",
      label: "Period start",
      type: "string",
      hint: "Sent as `date[start]`. Bounds the timesheet's own period.",
      advanced: true,
    },
    {
      key: "date_stop",
      label: "Period stop",
      type: "string",
      hint: "Sent as `date[stop]`. Inclusive — the vendor's own wording.",
      advanced: true,
    },
    {
      key: "approved_start",
      label: "Approved since",
      type: "string",
      hint: "Sent as `approved[start]`. Timesheets approved since this instant, in UTC. " +
        "Independent of the period bounds.",
      advanced: true,
    },
    csvParam("include", "Include", "Related data to side-load.", ["users"]),
    ...paginationParams(),
  ],
  output: [
    { key: "timesheets", type: "array", label: "Timesheets" },
    { key: "pagination", type: "object", label: "Cursor (next_page_start_id)" },
  ],

  execute(input, ctx) {
    return new HubstaffClient(ctx).request(`/organizations/${input.organization_id}/timesheets`, {
      query: {
        status: input.status,
        "date[start]": input.date_start,
        "date[stop]": input.date_stop,
        "approved[start]": input.approved_start,
        include: input.include,
        page_start_id: input.page_start_id,
        page_limit: input.page_limit,
      },
    });
  },
};

export default action;
