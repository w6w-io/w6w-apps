import type { ActionDefinition } from "@w6w/types";
import { QuoClient } from "../lib/client.ts";

/** `DELETE /v1/contacts/{id}` — delete a contact by its unique identifier. Returns 204. */
interface Input {
  id: string;
}

const contactDelete: ActionDefinition<Input> = {
  key: "contact-delete",
  type: "perform",
  resource: "contact",
  title: "Delete Contact",
  description: "Delete a contact by its unique identifier.",
  idempotent: true,
  params: [
    { key: "id", label: "Contact ID", type: "string", required: true },
  ],
  output: [
    { key: "deleted", type: "boolean", label: "Whether the delete request was accepted" },
  ],

  async execute(input, ctx) {
    await new QuoClient(ctx).json(`/contacts/${encodeURIComponent(input.id)}`, {
      method: "DELETE",
    });
    return { deleted: true };
  },
};

export default contactDelete;
