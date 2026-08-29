import type { ActionDefinition } from "@w6w/types";
import { HunterClient } from "../lib/client.ts";

/**
 * `DELETE /v2/leads_lists/{id}` — delete a leads list. Free. Answers
 * `204 No Content`. Idempotent: deleting an already-deleted list is a 404,
 * the same end state the caller wanted.
 */
interface Input {
  id: number;
}

const leadsListDelete: ActionDefinition<Input> = {
  key: "leads-list-delete",
  type: "perform",
  resource: "leads-list",
  title: "Delete Leads List",
  description: "Delete a leads list by ID. Free.",
  idempotent: true,
  params: [
    { key: "id", label: "Leads list ID", type: "number", required: true },
  ],
  output: [],

  execute(input, ctx) {
    return new HunterClient(ctx).request(
      `/leads_lists/${encodeURIComponent(String(input.id))}`,
      { method: "DELETE" },
    );
  },
};

export default leadsListDelete;
