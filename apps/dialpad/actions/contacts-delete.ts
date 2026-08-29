import type { ActionDefinition } from "@w6w/types";
import { DialpadClient, encodeId } from "../lib/client.ts";

/**
 * `DELETE /api/v2/contacts/{id}` — delete a contact by id.
 *
 * A delete's end state is the same however many times it runs — declared
 * idempotent.
 */
interface Input {
  contactId: string;
}

const contactsDelete: ActionDefinition<Input> = {
  key: "contacts-delete",
  type: "perform",
  resource: "contact",
  title: "Delete Contact",
  description: "Delete a contact by id.",
  idempotent: true,
  params: [
    { key: "contactId", label: "Contact ID", type: "string", required: true },
  ],
  output: [
    { key: "id", type: "string", label: "Contact ID" },
  ],

  execute(input, ctx) {
    return new DialpadClient(ctx).json(`/contacts/${encodeId(input.contactId)}`, {
      method: "DELETE",
    });
  },
};

export default contactsDelete;
