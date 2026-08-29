import type { ActionDefinition } from "@w6w/types";
import { SalesloftClient } from "../lib/client.ts";

interface Input {
  id: number;
}

/**
 * DELETE /v2/people/:id — delete a person. Not reversible without
 * contacting Salesloft support; safe to call more than once (Salesloft
 * documents repeat calls as succeeding).
 */
const personDelete: ActionDefinition<Input> = {
  key: "person-delete",
  type: "perform",
  resource: "person",
  title: "Delete Person",
  description:
    "Delete a person. This operation is not reversible without contacting Salesloft support.",
  idempotent: true,
  params: [
    { key: "id", label: "Person ID", type: "number", required: true },
  ],
  output: [{ key: "success", type: "boolean", label: "Deleted" }],

  async execute(input, ctx) {
    const client = new SalesloftClient(ctx);
    await client.request(`/people/${input.id}`, { method: "DELETE" });
    return { success: true };
  },
};

export default personDelete;
