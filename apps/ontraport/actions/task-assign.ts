import type { ActionDefinition } from "@w6w/types";
import { compact, OntraportClient } from "../lib/client.ts";

/**
 * `POST /1/task/assign` — assign a task message to one or more contacts (or
 * a group), creating the task(s).
 *
 * Note the parameter name here is `object_type_id`, not `objectID` — the two
 * generic-object endpoints this app also calls (`objects/tag`,
 * `objects/sequence`) use `objectID` for the same concept. The doc is not
 * consistent about it; both are transcribed verbatim, endpoint by endpoint.
 */
interface Input {
  objectTypeId?: number;
  contactIds?: string;
  groupId?: string;
  messageId?: number;
  taskType?: string;
  dueDateDays?: number;
  taskOwner?: string;
}

const taskAssign: ActionDefinition<Input> = {
  key: "task-assign",
  type: "perform",
  resource: "task",
  title: "Assign Task",
  description: "Assign a task message to one or more contacts, creating the task(s).",
  idempotent: false,
  params: [
    {
      key: "objectTypeId",
      label: "Object type ID",
      type: "number",
      default: 0,
      advanced: true,
      hint: "The type of object tasks are assigned to. 0 = Contact (the default).",
    },
    {
      key: "contactIds",
      label: "Contact IDs",
      type: "string",
      hint: "Comma-separated list. Either this or Group ID is required.",
    },
    { key: "groupId", label: "Group ID", type: "string", advanced: true },
    { key: "messageId", label: "Task message ID", type: "number" },
    {
      key: "taskType",
      label: "Task type",
      type: "select",
      advanced: true,
      options: [
        { value: "0", label: "Normal (default)" },
        { value: "-1", label: "Fulfillment" },
      ],
    },
    {
      key: "dueDateDays",
      label: "Due in (days)",
      type: "number",
      hint: "Days from now the task will be due.",
    },
    { key: "taskOwner", label: "Assignee user ID", type: "string" },
  ],
  output: [{ key: "ok", type: "boolean", label: "Assigned" }],

  async execute(input, ctx) {
    if (!input.contactIds && !input.groupId) {
      throw new Error("Either Contact IDs or Group ID is required to assign a task.");
    }
    const ids = input.contactIds
      ? input.contactIds.split(",").map((s) => Number(s.trim())).filter((n) => !Number.isNaN(n))
      : undefined;
    await new OntraportClient(ctx).envelope("/task/assign", {
      body: compact({
        object_type_id: input.objectTypeId ?? 0,
        ids,
        group_id: input.groupId ? Number(input.groupId) : undefined,
        message: compact({
          id: input.messageId,
          type: input.taskType !== undefined ? Number(input.taskType) : undefined,
          due_date: input.dueDateDays,
          task_owner: input.taskOwner ? Number(input.taskOwner) : undefined,
        }),
      }),
    });
    return { ok: true };
  },
};

export default taskAssign;
