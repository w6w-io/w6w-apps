import type { ActionDefinition } from "@w6w/types";
import { asOptionalJson, hostFromConnection, toList, WrikeClient } from "../lib/client.ts";
import {
  rawParamsParam,
  taskIdParam,
  taskImportanceOptions,
  taskStatusOptions,
} from "../lib/params.ts";

/**
 * `PUT /tasks/{taskId}` — update a task.
 *
 * Assignment fields are additive/subtractive (`addResponsibles` /
 * `removeResponsibles`), not a full replace — Wrike merges these into the
 * existing set rather than overwriting it, which is what makes this action
 * safe to mark idempotent: re-applying the same add/remove pair twice leaves
 * the same final membership both times.
 */
interface Input {
  taskId: string;
  title?: string;
  description?: string;
  status?: string;
  importance?: string;
  dates?: unknown;
  addResponsibles?: string[] | string;
  removeResponsibles?: string[] | string;
  addFollowers?: string[] | string;
  restore?: boolean;
  rawParams?: unknown;
}

const taskUpdate: ActionDefinition<Input> = {
  key: "task-update",
  type: "perform",
  resource: "task",
  title: "Update Task",
  description: "Update a task's title, status, dates or assignees.",
  idempotent: true,
  params: [
    taskIdParam,
    { key: "title", label: "Title", type: "string" },
    { key: "description", label: "Description (HTML)", type: "text" },
    { key: "status", label: "Status", type: "select", options: taskStatusOptions },
    { key: "importance", label: "Importance", type: "select", options: taskImportanceOptions },
    {
      key: "dates",
      label: "Dates (JSON)",
      type: "json",
      hint: 'Wrike TaskDates shape, e.g. {"start":"2026-09-01","due":"2026-09-05"}. When ' +
        "updating `duration`, also re-submit start and due even if unchanged — Wrike's own docs " +
        "warn that omitting them then clears the dates.",
    },
    { key: "addResponsibles", label: "Add assignee user IDs", type: "string" },
    {
      key: "removeResponsibles",
      label: "Remove assignee user IDs",
      type: "string",
      advanced: true,
    },
    { key: "addFollowers", label: "Add follower user IDs", type: "string", advanced: true },
    {
      key: "restore",
      label: "Restore from Recycle Bin",
      type: "boolean",
      advanced: true,
    },
    rawParamsParam,
  ],
  output: [
    { key: "id", type: "string", label: "Task ID" },
    { key: "title", type: "string", label: "Title" },
    { key: "status", type: "string", label: "Status" },
    { key: "updatedDate", type: "string", label: "Updated date" },
  ],

  execute(input, ctx) {
    const host = hostFromConnection(ctx.connection);
    return new WrikeClient(ctx, host).one(`/tasks/${encodeURIComponent(input.taskId)}`, {
      method: "PUT",
      query: {
        title: input.title,
        description: input.description,
        status: input.status,
        importance: input.importance,
        dates: asOptionalJson(input.dates, "Dates"),
        addResponsibles: toList(input.addResponsibles),
        removeResponsibles: toList(input.removeResponsibles),
        addFollowers: toList(input.addFollowers),
        restore: input.restore,
        ...asOptionalJson<Record<string, unknown>>(input.rawParams, "Additional parameters"),
      },
    });
  },
};

export default taskUpdate;
