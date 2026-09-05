import type { ActionDefinition } from "@w6w/types";
import { MeisterTaskClient } from "../lib/client.ts";

/** `DELETE /checklists/:id` — remove a checklist and its items. */
interface Input {
  id: number;
}

const checklistDelete: ActionDefinition<Input, { deleted: boolean }> = {
  key: "checklist-delete",
  type: "perform",
  resource: "checklist",
  title: "Delete Checklist",
  description: "Delete a checklist.",
  // A repeated delete of an already-gone checklist ends in the same state.
  idempotent: true,
  params: [{ key: "id", label: "Checklist ID", type: "number", required: true }],
  output: [{ key: "deleted", type: "boolean", label: "Deleted" }],

  async execute(input, ctx) {
    const status = await new MeisterTaskClient(ctx).status(`/checklists/${input.id}`, {
      method: "DELETE",
    });
    return { deleted: status === 204 };
  },
};

export default checklistDelete;
