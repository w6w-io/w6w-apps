import type { ActionDefinition } from "@w6w/types";
import { compact, SellClient } from "../lib/client.ts";
import { ownerIdParam } from "../lib/params.ts";

interface Input {
  id: number;
  content?: string;
  dueDate?: string;
  ownerId?: number;
  resourceType?: string;
  resourceId?: number;
  completed?: boolean;
  remindAt?: string;
}

const taskUpdate: ActionDefinition<Input> = {
  key: "task-update",
  type: "perform",
  resource: "task",
  title: "Update Task",
  description: "Update an existing task.",
  idempotent: true,
  params: [
    { key: "id", label: "Task ID", type: "number", required: true },
    { key: "content", label: "Content", type: "text" },
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
    },
    { key: "resourceId", label: "Resource ID", type: "number" },
    { key: "completed", label: "Completed", type: "boolean" },
    { key: "remindAt", label: "Remind at", type: "datetime" },
  ],
  output: [
    { key: "id", type: "number", label: "Task ID" },
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
    return await new SellClient(ctx).update(`/tasks/${encodeURIComponent(String(input.id))}`, data);
  },
};

export default taskUpdate;
