import type { ActionDefinition } from "@w6w/types";
import { MeisterTaskClient } from "../lib/client.ts";

/** `PUT /checklist_items/:id` — rename, re-sequence, or check off a checklist item. */
interface Input {
  id: number;
  name?: string;
  sequence?: number;
  status?: number;
}

const checklistItemUpdate: ActionDefinition<Input> = {
  key: "checklist-item-update",
  type: "perform",
  resource: "checklist-item",
  title: "Update Checklist Item",
  description: "Rename a checklist item, re-sequence it, or change its status " +
    "(e.g. mark it done).",
  idempotent: true,
  params: [
    { key: "id", label: "Checklist Item ID", type: "number", required: true },
    { key: "name", label: "Name", type: "string" },
    { key: "sequence", label: "Sequence", type: "number" },
    {
      key: "status",
      label: "Status",
      type: "select",
      options: [
        { value: 1, label: "Actionable" },
        { value: 5, label: "Completed" },
      ],
    },
  ],
  output: [
    { key: "id", type: "number", label: "Checklist item ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "status", type: "number", label: "Status" },
  ],

  execute(input, ctx) {
    return new MeisterTaskClient(ctx).request(`/checklist_items/${input.id}`, {
      method: "PUT",
      body: { name: input.name, sequence: input.sequence, status: input.status },
    });
  },
};

export default checklistItemUpdate;
