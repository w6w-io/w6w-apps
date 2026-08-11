import type { ActionDefinition } from "@w6w/types";
import { encodeId, KeapClient, V2 } from "../lib/client.ts";

/**
 * `DELETE /rest/v2/contacts/{contact_id}` — Delete a Contact.
 *
 * Keap declares no success body for this operation, so the status is the
 * result. It is marked idempotent because deleting an already-deleted contact
 * is not a second deletion — the second call 404s, which the client surfaces as
 * an error rather than pretending it succeeded.
 */
interface Input {
  contactId: string;
}

const contactDelete: ActionDefinition<Input> = {
  key: "contact-delete",
  type: "perform",
  title: "Delete Contact",
  resource: "contact",
  description: "Permanently delete a contact and everything Keap cascades from it.",
  idempotent: true,
  params: [
    {
      key: "contactId",
      label: "Contact ID",
      type: "string",
      required: true,
      hint: "Deletion is permanent. Keap offers no undelete and no trash for contacts.",
    },
  ],
  output: [{ key: "status", type: "number", label: "HTTP status" }],

  async execute(input, ctx) {
    const client = new KeapClient(ctx);
    const status = await client.status(`${V2}/contacts/${encodeId(input.contactId)}`, {
      method: "DELETE",
    });
    return { status };
  },
};

export default contactDelete;
