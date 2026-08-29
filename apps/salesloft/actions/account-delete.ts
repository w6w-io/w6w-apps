import type { ActionDefinition } from "@w6w/types";
import { SalesloftClient } from "../lib/client.ts";

interface Input {
  id: number;
}

/**
 * DELETE /v2/accounts/:id — delete an account. Not reversible without
 * contacting Salesloft support; deleting an account removes all connected
 * people from it.
 */
const accountDelete: ActionDefinition<Input> = {
  key: "account-delete",
  type: "perform",
  resource: "account",
  title: "Delete Account",
  description:
    "Delete an account. Not reversible without contacting Salesloft support. Removes all connected people from the account.",
  idempotent: true,
  params: [
    { key: "id", label: "Account ID", type: "number", required: true },
  ],
  output: [{ key: "success", type: "boolean", label: "Deleted" }],

  async execute(input, ctx) {
    const client = new SalesloftClient(ctx);
    await client.request(`/accounts/${input.id}`, { method: "DELETE" });
    return { success: true };
  },
};

export default accountDelete;
