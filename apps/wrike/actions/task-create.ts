import type { ActionDefinition } from "@w6w/types";
import { asOptionalJson, hostFromConnection, toList, WrikeClient } from "../lib/client.ts";
import {
  billingTypeOptions,
  rawParamsParam,
  taskImportanceOptions,
  taskStatusOptions,
} from "../lib/params.ts";

/**
 * `POST /folders/{folderId}/tasks` — create a task inside a folder or project.
 *
 * `folderId` becomes the task's parent folder. To create a task at the
 * account root, pass the account's virtual root folder ID (`account-get`'s
 * `rootFolderId`). To create a **subtask**, pass the root folder ID here and
 * name the real parent task in `superTasks` instead — Wrike's own
 * documentation for this endpoint states this explicitly, and it is easy to
 * miss because it means `folderId` does NOT become the subtask's folder.
 *
 * `dates` takes Wrike's `TaskDates` shape verbatim
 * (`{"start":"2026-09-01","due":"2026-09-05"}` or `{"duration":480}`) — see
 * the `dates` param's hint. Not idempotent: Wrike documents no idempotency key
 * for this endpoint, so a retry creates a second task.
 */
interface Input {
  folderId: string;
  title: string;
  description?: string;
  status?: string;
  importance?: string;
  dates?: unknown;
  responsibles?: string[] | string;
  followers?: string[] | string;
  superTasks?: string[] | string;
  billingType?: string;
  rawParams?: unknown;
}

const taskCreate: ActionDefinition<Input> = {
  key: "task-create",
  type: "perform",
  resource: "task",
  title: "Create Task",
  description: "Create a task in a folder or project.",
  idempotent: false,
  params: [
    {
      key: "folderId",
      label: "Parent folder or project",
      type: "string",
      required: true,
      hint: "Use the account root folder ID (see Get Account) to create at the account root.",
    },
    { key: "title", label: "Title", type: "string", required: true },
    { key: "description", label: "Description (HTML)", type: "text" },
    {
      key: "status",
      label: "Status",
      type: "select",
      options: taskStatusOptions,
      hint: "Not available on Wrike's Team plan, per the vendor's own parameter description.",
    },
    { key: "importance", label: "Importance", type: "select", options: taskImportanceOptions },
    {
      key: "dates",
      label: "Dates (JSON)",
      type: "json",
      hint: 'Wrike TaskDates shape, e.g. {"start":"2026-09-01","due":"2026-09-05"} or ' +
        '{"duration":480}. Omit for a backlogged task.',
    },
    {
      key: "responsibles",
      label: "Assignee user IDs",
      type: "string",
      hint: "Comma-separated Wrike user IDs.",
    },
    { key: "followers", label: "Follower user IDs", type: "string", advanced: true },
    {
      key: "superTasks",
      label: "Parent task IDs (for a subtask)",
      type: "string",
      advanced: true,
      hint: "Set this AND use the account root as Parent folder to create a subtask.",
    },
    {
      key: "billingType",
      label: "Billing type",
      type: "select",
      options: billingTypeOptions,
      advanced: true,
    },
    rawParamsParam,
  ],
  output: [
    { key: "id", type: "string", label: "Task ID" },
    { key: "title", type: "string", label: "Title" },
    { key: "status", type: "string", label: "Status" },
    { key: "permalink", type: "string", label: "Link to open in Wrike" },
  ],

  execute(input, ctx) {
    const host = hostFromConnection(ctx.connection);
    ctx.log("info", "creating Wrike task", { folderId: input.folderId, title: input.title });
    return new WrikeClient(ctx, host).one(`/folders/${encodeURIComponent(input.folderId)}/tasks`, {
      method: "POST",
      query: {
        title: input.title,
        description: input.description,
        status: input.status,
        importance: input.importance,
        dates: asOptionalJson(input.dates, "Dates"),
        responsibles: toList(input.responsibles),
        followers: toList(input.followers),
        superTasks: toList(input.superTasks),
        billingType: input.billingType,
        ...asOptionalJson<Record<string, unknown>>(input.rawParams, "Additional parameters"),
      },
    });
  },
};

export default taskCreate;
