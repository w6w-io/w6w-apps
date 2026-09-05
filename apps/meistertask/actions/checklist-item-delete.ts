import type { ActionDefinition } from "@w6w/types";
import { MeisterTaskClient } from "../lib/client.ts";

/** `DELETE /checklist_items/:id` — remove an item from its checklist. */
interface Input {
  id: number;
}

const checklistItemDelete: ActionDefinition<Input, { deleted: boolean }> = {
  key: "checklist-item-delete",
  type: "perform",
  resource: "checklist-item",
  title: "Delete Checklist Item",
  description: "Delete an item from its checklist.",
  idempotent: true,
  params: [{ key: "id", label: "Checklist Item ID", type: "number", required: true }],
  output: [{ key: "deleted", type: "boolean", label: "Deleted" }],

  async execute(input, ctx) {
    const status = await new MeisterTaskClient(ctx).status(`/checklist_items/${input.id}`, {
      method: "DELETE",
    });
    return { deleted: status === 204 };
  },
};

export default checklistItemDelete;
