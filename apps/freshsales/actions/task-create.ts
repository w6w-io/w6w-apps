import type { ActionDefinition } from "@w6w/types";
import { compact, FreshsalesClient, unset } from "../lib/client.ts";
import { targetableTypeOptions } from "../lib/params.ts";

interface Input {
  title: string;
  description?: string;
  dueDate?: string;
  ownerId?: number;
  targetableType?: "Contact" | "SalesAccount" | "Deal";
  targetableId?: number;
}

const taskCreate: ActionDefinition<Input> = {
  key: "task-create",
  type: "perform",
  resource: "task",
  title: "Create Task",
  description: "Create a task, optionally against a contact, an account or a deal.",
  idempotent: false,
  params: [
    { key: "title", label: "Title", type: "string", required: true },
    { key: "description", label: "Description", type: "text" },
    { key: "dueDate", label: "Due date", type: "datetime" },
    { key: "ownerId", label: "Owner (user) ID", type: "number", advanced: true },
    {
      key: "targetableType",
      label: "Attach to",
      type: "select",
      row: "target",
      advanced: true,
      options: targetableTypeOptions,
    },
    {
      key: "targetableId",
      label: "Record ID",
      type: "number",
      row: "target",
      advanced: true,
    },
  ],
  output: [
    { key: "id", type: "number", label: "Task ID" },
    { key: "title", type: "string", label: "Title" },
    { key: "status", type: "number", label: "Status" },
  ],

  execute(input, ctx) {
    return new FreshsalesClient(ctx).resource("task", "/tasks", {
      method: "POST",
      body: {
        task: compact({
          title: input.title,
          description: unset(input.description),
          due_date: unset(input.dueDate),
          owner_id: input.ownerId,
          targetable_type: input.targetableType,
          targetable_id: input.targetableId,
        }),
      },
    });
  },
};

export default taskCreate;
