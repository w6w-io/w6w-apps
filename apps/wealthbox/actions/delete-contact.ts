import type { ActionDefinition } from "@w6w/types";
import { WealthboxClient } from "../lib/client.ts";

interface Input {
  contactId: number;
}

/**
 * `DELETE /v1/contacts/{id}` — delete a Contact. Destructive and irreversible
 * via the API.
 *
 * Idempotent in the sense that matters for retries: deleting an
 * already-deleted Contact converges on the same end state (Wealthbox answers
 * a repeat with 404 rather than doing further damage).
 */
const deleteContact: ActionDefinition<Input> = {
  key: "delete-contact",
  type: "perform",
  resource: "contact",
  title: "Delete Contact",
  description: "Delete a Contact. Destructive and irreversible.",
  idempotent: true,
  params: [
    { key: "contactId", label: "Contact ID", type: "number", required: true },
  ],
  output: [],

  async execute(input, ctx) {
    ctx.log("warn", "deleting contact", { contactId: input.contactId });
    await new WealthboxClient(ctx).request(`/contacts/${encodeURIComponent(input.contactId)}`, {
      method: "DELETE",
    });
    return {};
  },
};

export default deleteContact;
