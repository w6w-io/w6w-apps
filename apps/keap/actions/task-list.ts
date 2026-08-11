import type { ActionDefinition } from "@w6w/types";
import { eq, joinFilters, KeapClient, nextPageToken, V2 } from "../lib/client.ts";
import { filterParam, orderByParam, pageParams, taskPriorityOptions } from "../lib/params.ts";

/**
 * `GET /rest/v2/tasks` — List Tasks.
 *
 * `user_id==UNASSIGNED` is a documented sentinel, not an id: "Tasks which are
 * not assigned to a User may be queried with `user_id==UNASSIGNED`." It is the
 * only way to find them, since a task always carries an
 * `assigned_to_user_id` slot and an empty filter returns everything.
 */
interface Input {
  contactId?: string;
  userId?: string;
  opportunityId?: string;
  isCompleted?: string;
  priority?: string;
  sinceTime?: string;
  untilTime?: string;
  filter?: string;
  orderBy?: string;
  includeCustomFields?: boolean;
  pageSize?: number;
  pageToken?: string;
}

const taskList: ActionDefinition<Input> = {
  key: "task-list",
  type: "search",
  title: "List Tasks",
  resource: "task",
  description: "Search tasks by owner, contact, opportunity, completion state or due window.",
  params: [
    { key: "contactId", label: "Contact ID", type: "string" },
    {
      key: "userId",
      label: "Assigned user ID",
      type: "string",
      hint: "Pass `UNASSIGNED` to find tasks with no owner.",
    },
    { key: "opportunityId", label: "Opportunity ID", type: "string" },
    {
      key: "isCompleted",
      label: "Completion",
      type: "select",
      options: [
        { value: "true", label: "Completed only" },
        { value: "false", label: "Open only" },
      ],
      hint: "Leave empty for both.",
    },
    { key: "priority", label: "Priority", type: "select", options: taskPriorityOptions },
    { key: "sinceTime", label: "Due since", type: "datetime", advanced: true },
    { key: "untilTime", label: "Due until", type: "datetime", advanced: true },
    filterParam,
    orderByParam("One of `id`, `create_time`, `due_time`, `update_time`, plus `asc` or `desc`."),
    {
      key: "includeCustomFields",
      label: "Include custom fields",
      type: "boolean",
      advanced: true,
      hint: "`custom_fields` is the only value Keap accepts for `fields` on tasks.",
    },
    ...pageParams(),
  ],
  output: [
    { key: "tasks", type: "array", label: "Tasks" },
    { key: "count", type: "number", label: "Tasks returned" },
    { key: "nextPageToken", type: "string", label: "Next page token" },
  ],

  async execute(input, ctx) {
    const filter = joinFilters([
      eq("contact_id", input.contactId),
      eq("user_id", input.userId),
      eq("opportunity_id", input.opportunityId),
      eq("is_completed", input.isCompleted),
      eq("priority", input.priority),
      eq("since_time", input.sinceTime),
      eq("until_time", input.untilTime),
      input.filter,
    ]);
    const client = new KeapClient(ctx);
    const body = await client.json<{ tasks?: unknown[]; next_page_token?: string }>(`${V2}/tasks`, {
      query: {
        filter,
        order_by: input.orderBy,
        fields: input.includeCustomFields ? "custom_fields" : undefined,
        page_size: input.pageSize,
        page_token: input.pageToken,
      },
    });
    const tasks = body?.tasks ?? [];
    return { tasks, count: tasks.length, nextPageToken: nextPageToken(body) };
  },
};

export default taskList;
