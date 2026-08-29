import type { ActionDefinition } from "@w6w/types";
import { HunterClient } from "../lib/client.ts";

/**
 * `DELETE /v2/leads/{id}` — delete an existing lead. Free. Answers
 * `204 No Content`. Idempotent: deleting an already-deleted lead is a 404,
 * which is the same end state the caller wanted.
 */
interface Input {
  id: number;
}

const leadDelete: ActionDefinition<Input> = {
  key: "lead-delete",
  type: "perform",
  resource: "lead",
  title: "Delete Lead",
  description: "Delete an existing lead by ID. Free.",
  idempotent: true,
  params: [
    { key: "id", label: "Lead ID", type: "number", required: true },
  ],
  output: [],

  execute(input, ctx) {
    return new HunterClient(ctx).request(`/leads/${encodeURIComponent(String(input.id))}`, {
      method: "DELETE",
    });
  },
};

export default leadDelete;
