import type { ActionDefinition } from "@w6w/types";
import { InvoiceNinjaClient } from "../lib/client.ts";

interface Input {
  clientId: string;
}

/**
 * `DELETE /api/v1/clients/{id}` — verified against `deleteClient`. Invoice
 * Ninja soft-deletes (`is_deleted`); re-deleting an already-deleted client
 * still returns the record rather than erroring, so retrying converges on the
 * same end state.
 */
const clientDelete: ActionDefinition<Input> = {
  key: "client-delete",
  type: "perform",
  resource: "client",
  title: "Delete Client",
  description: "Soft-delete a client.",
  idempotent: true,
  params: [
    { key: "clientId", label: "Client ID", type: "string", required: true },
  ],
  output: [],

  async execute(input, ctx) {
    await new InvoiceNinjaClient(ctx).request(`/clients/${input.clientId}`, { method: "DELETE" });
    return {};
  },
};

export default clientDelete;
