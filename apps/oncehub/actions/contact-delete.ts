import type { ActionDefinition } from "@w6w/types";
import { OnceHubClient } from "../lib/client.ts";

interface Input {
  id: string;
}

/** DELETE /contacts/{id} → `{ id, deleted: true }`. */
const contactDelete: ActionDefinition<Input> = {
  key: "contact-delete",
  type: "perform",
  resource: "contact",
  title: "Delete Contact",
  description: "Delete a contact by ID (DELETE /contacts/{id}).",
  idempotent: true,
  output: [
    { key: "id", type: "string", label: "Contact ID" },
    { key: "deleted", type: "boolean", label: "Deleted" },
  ],
  params: [
    { key: "id", label: "Contact ID", type: "string", required: true },
  ],

  execute(input, ctx) {
    return new OnceHubClient(ctx).request(`/contacts/${encodeURIComponent(input.id)}`, {
      method: "DELETE",
    });
  },
};

export default contactDelete;
