import type { ActionDefinition } from "@w6w/types";
import { HubstaffClient } from "../lib/client.ts";
import { csvParam, organizationIdParam, paginationParams } from "../lib/params.ts";

/**
 * `GET /v2/organizations/{organization_id}/activities` — tracked activity.
 *
 * Returns `{"activities": [{...Activity}]}` plus the cursor envelope. A row is
 * a **10-minute block** with `user_id`, `project_id`, `task_id`, `date`,
 * `time_slot`, `starts_at`, `tracked` and `input_tracked` (seconds),
 * `keyboard`/`mouse`/`overall` (seconds), plus `location_type` (`unknown`,
 * `remote`, `on_site`), `time_type`, `client`, `billable`, `paid`,
 * `client_invoiced`, `team_invoiced`, `immutable`, `timesheet_id` and
 * `timesheet_locked`.
 *
 * ## Three things worth knowing before paging this
 *
 * **It is the closest thing v2 has to "the individual time entries".** There is
 * no list endpoint for time entries at all (see `time-entry-create`), and
 * timesheets are aggregate approval records. Activities are the per-block
 * detail, but they are *aggregated into 10-minute slots* — do not expect the
 * exact rows a member's timer produced.
 *
 * **The data is delayed.** The vendor's operation note: "Data may be delayed up
 * to 20 minutes." A workflow that writes a time entry and immediately reads
 * activities back will not see it.
 *
 * **`time_slot[stop]` is exclusive; `time_slot[start]` is not.** Bound a window
 * as `[start, stop)` or the boundary block appears in two pulls.
 *
 * `time_zone` buckets the returned `date` by the named zone; `include` takes
 * `users`, `projects` and `tasks`.
 */
interface Input {
  organization_id: number;
  time_slot_start?: string;
  time_slot_stop?: string;
  user_ids?: string;
  project_ids?: string;
  task_ids?: string;
  time_zone?: string;
  include?: string;
  page_start_id?: number;
  page_limit?: number;
}

const action: ActionDefinition<Input> = {
  key: "activity-list",
  type: "read",
  resource: "activity",
  title: "List Activities",
  description:
    "List an organization's tracked activity blocks (GET /v2/organizations/{organization_id}/activities).",
  params: [
    organizationIdParam,
    {
      key: "time_slot_start",
      label: "Window start",
      type: "string",
      hint: "Sent as `time_slot[start]`. ISO 8601.",
    },
    {
      key: "time_slot_stop",
      label: "Window stop",
      type: "string",
      hint: "Sent as `time_slot[stop]`. ISO 8601, **exclusive**.",
    },
    csvParam("user_ids", "User IDs", "Activity for any of these members.", []),
    csvParam("project_ids", "Project IDs", "Activity on any of these projects.", []),
    csvParam("task_ids", "Task IDs", "Activity on any of these tasks.", []),
    {
      key: "time_zone",
      label: "Time zone",
      type: "string",
      hint: "The time zone name used to bucket the returned `date`, e.g. `Europe/London`.",
      advanced: true,
    },
    csvParam("include", "Include", "Related data to side-load.", ["users", "projects", "tasks"]),
    ...paginationParams(),
  ],
  output: [
    { key: "activities", type: "array", label: "Activities" },
    { key: "pagination", type: "object", label: "Cursor (next_page_start_id)" },
  ],

  execute(input, ctx) {
    return new HubstaffClient(ctx).request(`/organizations/${input.organization_id}/activities`, {
      query: {
        "time_slot[start]": input.time_slot_start,
        "time_slot[stop]": input.time_slot_stop,
        user_ids: input.user_ids,
        project_ids: input.project_ids,
        task_ids: input.task_ids,
        time_zone: input.time_zone,
        include: input.include,
        page_start_id: input.page_start_id,
        page_limit: input.page_limit,
      },
    });
  },
};

export default action;
