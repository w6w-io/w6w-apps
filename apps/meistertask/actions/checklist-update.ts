import type { ActionDefinition } from "@w6w/types";
import { MeisterTaskClient } from "../lib/client.ts";

/** `PUT /checklists/:id` — rename a checklist or change its sort order. */
interface Input {
  id: number;
  name?: string;
  sequence?: number;
}

const checklistUpdate: ActionDefinition<Input> = {
  key: "checklist-update",
  type: "perform",
  resource: "checklist",
  title: "Update Checklist",
  description: "Rename a checklist or change its sort order.",
  idempotent: true,
  params: [
    { key: "id", label: "Checklist ID", type: "number", required: true },
    { key: "name", label: "Name", type: "string" },
    { key: "sequence", label: "Sequence", type: "number" },
  ],
  output: [
    { key: "id", type: "number", label: "Checklist ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "sequence", type: "number", label: "Sequence" },
  ],

  execute(input, ctx) {
    return new MeisterTaskClient(ctx).request(`/checklists/${input.id}`, {
      method: "PUT",
      body: { name: input.name, sequence: input.sequence },
    });
  },
};

export default checklistUpdate;
