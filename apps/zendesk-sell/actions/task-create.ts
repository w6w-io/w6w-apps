import type { ActionDefinition } from "@w6w/types";
import { compact, SellClient } from "../lib/client.ts";
import { ownerIdParam } from "../lib/params.ts";

/**
 * `POST /v2/tasks` — create a floating task (owner only) or a related task
 * (attached to a lead, contact or deal — set both resourceType and
 * resourceId, or neither).
 *
 * "The remind_at date must be set earlier than the due_date attribute."
 */
interface Input {
  content: string;
  dueDate?: string;
  ownerId?: number;
  resourceType?: string;
  resourceId?: number;
  completed?: boolean;
  remindAt?: string;
}

const taskCreate: ActionDefinition<Input> = {
  key: "task-create",
  type: "perform",
  resource: "task",
  title: "Create Task",
  description: "Create a floating task, or a related task attached to a lead, contact or deal.",
  idempotent: false,
  params: [
    { key: "content", label: "Content", type: "text", required: true },
    { key: "dueDate", label: "Due date", type: "datetime" },
    ownerIdParam,
    {
      key: "resourceType",
      label: "Attached to",
      type: "select",
      options: [
        { value: "lead", label: "Lead" },
        { value: "contact", label: "Contact" },
        { value: "deal", label: "Deal" },
      ],
      hint: "Leave both this and Resource ID empty for a floating task.",
    },
    { key: "resourceId", label: "Resource ID", type: "number" },
    { key: "completed", label: "Completed", type: "boolean" },
    {
      key: "remindAt",
      label: "Remind at",
      type: "datetime",
      hint: "Must be earlier than Due date.",
    },
  ],
  output: [
    { key: "id", type: "number", label: "New task ID" },
  ],

  async execute(input, ctx) {
    const data = compact({
      content: input.content,
      due_date: input.dueDate,
      owner_id: input.ownerId,
      resource_type: input.resourceType,
      resource_id: input.resourceId,
      completed: input.completed,
      remind_at: input.remindAt,
    });
    return await new SellClient(ctx).create("/tasks", data, "task");
  },
};

export default taskCreate;
