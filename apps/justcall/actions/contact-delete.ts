import type { ActionDefinition } from "@w6w/types";
import { JustCallClient } from "../lib/client.ts";

/**
 * `DELETE /v2.1/contacts` — verified against `delete_contact_v21`'s OpenAPI
 * fragment, 2026-09-05.
 *
 * Addressed by query parameter, not a path segment — send `id` or
 * `contact_number` (with `across_team` to delete for all agents).
 */
interface Input {
  id?: number;
  contact_number?: string;
  across_team?: boolean;
}

const contactDelete: ActionDefinition<Input> = {
  key: "contact-delete",
  type: "perform",
  resource: "contact",
  title: "Delete Contact",
  description:
    "Delete a contact by id or contact_number. Send across_team as true to delete for all " +
    "agents in the account.",
  // Deleting an already-deleted contact ends in the same state.
  idempotent: true,
  params: [
    { key: "id", label: "Contact ID", type: "number" },
    { key: "contact_number", label: "Contact number", type: "string" },
    {
      key: "across_team",
      label: "Across team",
      type: "boolean",
      hint: "true: delete for all agents. false (default): only the account owner.",
    },
  ],
  output: [
    { key: "status", type: "string", label: "success or failed" },
  ],

  async execute(input, ctx) {
    const client = new JustCallClient(ctx);
    return await client.data("/contacts", {
      method: "DELETE",
      query: {
        id: input.id,
        contact_number: input.contact_number,
        across_team: input.across_team,
      },
    });
  },
};

export default contactDelete;
