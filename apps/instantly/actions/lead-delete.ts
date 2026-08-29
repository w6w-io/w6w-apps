import type { ActionDefinition } from "@w6w/types";
import { InstantlyClient } from "../lib/client.ts";
import { leadIdParam } from "../lib/params.ts";

/** `DELETE /api/v2/leads/{id}` — returns the now-deleted Lead. */
interface Input {
  id: string;
}

const leadDelete: ActionDefinition<Input> = {
  key: "lead-delete",
  type: "perform",
  resource: "lead",
  title: "Delete Lead",
  description: "Permanently delete a single lead. Returns the deleted lead's last state.",
  idempotent: true,
  params: [leadIdParam],
  output: [
    { key: "id", type: "string", label: "Lead ID" },
    { key: "email", type: "string", label: "Email" },
  ],

  execute(input, ctx) {
    return new InstantlyClient(ctx).json(`/leads/${encodeURIComponent(input.id)}`, {
      method: "DELETE",
    });
  },
};

export default leadDelete;
