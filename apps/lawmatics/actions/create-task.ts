import type { ActionDefinition } from "@w6w/types";
import { compact, LawmaticsClient, type LawmaticsItemEnvelope } from "../lib/client.ts";
import { ASSOCIATION_TYPES } from "../lib/params.ts";

interface Input {
  name: string;
  description?: string;
  dueDate?: string;
  priority?: string;
  taskableType?: string;
  taskableId?: string;
  userIds?: string;
  assignedById?: string;
}

/**
 * `POST /v1/tasks` — create a Task.
 *
 * `priority` and the `taskable_type` vocabulary are confirmed against the
 * collection's "Update Task" description (the same optional fields apply to
 * create): `priority` is one of `high`/`medium`/`low` (default `low`);
 * `taskable_type` is one of `Prospect` (Matter)/`Contact`/`Company`/`Client`.
 * `due_date` accepts an ISO 8601 datetime per that same doc, even though the
 * vendor's own sample body uses the legacy `MM/DD/YYYY` string — either is
 * passed through verbatim here rather than reformatted.
 *
 * `recurrence_rule` (a nested JSON object for daily/weekly/monthly/yearly
 * repeats) and `tag_ids` are left out: the collection documents the object's
 * shape only in prose, with no confirmed example response to verify a
 * round-trip against.
 */
const createTask: ActionDefinition<Input> = {
  key: "create-task",
  type: "perform",
  resource: "task",
  title: "Create Task",
  description: "Create a new Task, optionally attached to a Matter, Contact, Company or Client.",
  idempotent: false,
  params: [
    { key: "name", label: "Name", type: "string", required: true },
    { key: "description", label: "Description", type: "text" },
    {
      key: "dueDate",
      label: "Due Date",
      type: "string",
      hint: "ISO 8601 datetime, e.g. 2026-09-30T17:00:00-07:00.",
    },
    {
      key: "priority",
      label: "Priority",
      type: "select",
      options: [
        { value: "low", label: "Low (default)" },
        { value: "medium", label: "Medium" },
        { value: "high", label: "High" },
      ],
    },
    {
      key: "taskableType",
      label: "Associated Record Type",
      type: "select",
      options: ASSOCIATION_TYPES,
    },
    {
      key: "taskableId",
      label: "Associated Record ID",
      hint: "ID of the Matter/Contact/Company/Client named above.",
      type: "string",
      dependsOn: ["taskableType"],
    },
    {
      key: "userIds",
      label: "Assigned User IDs",
      type: "string",
      hint: "Comma-separated Lawmatics User IDs to assign this Task to.",
      advanced: true,
    },
    { key: "assignedById", label: "Assigned By (User ID)", type: "string", advanced: true },
  ],
  output: [
    { key: "id", type: "string", label: "Task ID" },
    { key: "type", type: "string", label: "Resource type" },
    { key: "attributes", type: "object", label: "Task attributes" },
  ],

  async execute(input, ctx) {
    const userIds = input.userIds
      ? input.userIds.split(",").map((s) => s.trim()).filter(Boolean)
      : undefined;
    const res = await new LawmaticsClient(ctx).request<LawmaticsItemEnvelope>("/tasks", {
      method: "POST",
      body: compact({
        name: input.name,
        description: input.description,
        due_date: input.dueDate,
        priority: input.priority,
        taskable_type: input.taskableType,
        taskable_id: input.taskableId,
        user_ids: userIds,
        assigned_by_id: input.assignedById,
      }),
    });
    return res.data;
  },
};

export default createTask;
