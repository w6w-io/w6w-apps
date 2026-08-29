import type { ActionDefinition } from "@w6w/types";
import { DialpadClient, encodeId } from "../lib/client.ts";

/**
 * `GET /api/v2/contacts/{id}` — get one contact by id.
 *
 * The vendor's own note: "Currently, only contacts of type shared and local
 * can be retrieved by this API" — a `google` or other synced-source contact id
 * will not resolve here even if it appears in a List Contacts result.
 */
interface Input {
  contactId: string;
}

const contactsGet: ActionDefinition<Input> = {
  key: "contacts-get",
  type: "read",
  resource: "contact",
  title: "Get Contact",
  description: "Get a shared or local contact by id.",
  params: [
    { key: "contactId", label: "Contact ID", type: "string", required: true },
  ],
  output: [
    { key: "id", type: "string", label: "Contact ID" },
    { key: "display_name", type: "string", label: "Display name" },
    { key: "primary_email", type: "string", label: "Primary email" },
    { key: "primary_phone", type: "string", label: "Primary phone" },
  ],

  execute(input, ctx) {
    return new DialpadClient(ctx).json(`/contacts/${encodeId(input.contactId)}`);
  },
};

export default contactsGet;
