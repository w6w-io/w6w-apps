import type { ActionDefinition } from "@w6w/types";
import { HubstaffClient } from "../lib/client.ts";
import { csvParam, paginationParams, projectIdParam } from "../lib/params.ts";

/**
 * `GET /v2/projects/{project_id}/activities` — tracked activity on one project.
 *
 * The same `Activity` schema and the same cursor envelope as `activity-list`,
 * scoped by path instead of by the `project_ids` filter. It differs from the
 * organization read in exactly one way: it takes `project_id` in the URL, so it
 * works for a caller that holds a project id but not the organization id.
 *
 * Everything `activity-list` documents about 10-minute blocks, the up-to-20-
 * minute delay, and `time_slot[start]`/`time_slot[stop]` (the stop is
 * exclusive) applies here unchanged.
 */
interface Input {
  project_id: number;
  time_slot_start?: string;
  time_slot_stop?: string;
  user_ids?: string;
  task_ids?: string;
  time_zone?: string;
  include?: string;
  page_start_id?: number;
  page_limit?: number;
}

const action: ActionDefinition<Input> = {
  key: "project-activity-list",
  type: "read",
  resource: "activity",
  title: "List Project Activities",
  description:
    "List the tracked activity blocks on one project (GET /v2/projects/{project_id}/activities).",
  params: [
    projectIdParam,
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
    csvParam("task_ids", "Task IDs", "Activity on any of these tasks.", []),
    {
      key: "time_zone",
      label: "Time zone",
      type: "string",
      hint: "The time zone name used to bucket the returned `date`.",
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
    return new HubstaffClient(ctx).request(`/projects/${input.project_id}/activities`, {
      query: {
        "time_slot[start]": input.time_slot_start,
        "time_slot[stop]": input.time_slot_stop,
        user_ids: input.user_ids,
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
