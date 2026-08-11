import type { ActionDefinition } from "@w6w/types";
import { EmailOctopusClient, seg } from "../lib/client.ts";

interface Input {
  listId: string;
  contactId: string;
}

/**
 * `DELETE /lists/{list_id}/contacts/{contact_id}` — 204, no body.
 *
 * Deletion is not unsubscription: it erases the contact and its history.
 * To stop mailing someone while keeping the record, set `status` to
 * `unsubscribed` with `update-contact` instead.
 */
const deleteContact: ActionDefinition<Input> = {
  key: "delete-contact",
  type: "perform",
  resource: "contact",
  title: "Delete Contact",
  description:
    "Permanently remove a contact from a list. Returns 204 with no body. To stop mailing a contact but keep the record, set its status to `unsubscribed` instead.",
  idempotent: true,
  params: [
    {
      key: "listId",
      label: "List ID",
      type: "string",
      required: true,
      placeholder: "00000000-0000-0000-0000-000000000000",
    },
    {
      key: "contactId",
      label: "Contact ID or email MD5",
      type: "string",
      required: true,
      hint: "The contact UUID, or the MD5 hash of the lowercased email address.",
    },
  ],
  output: [{ key: "deleted", type: "boolean", label: "Always true when the call succeeded" }],

  async execute(input, ctx) {
    await new EmailOctopusClient(ctx).request(
      `/lists/${seg(input.listId)}/contacts/${seg(input.contactId)}`,
      { method: "DELETE" },
    );
    return { deleted: true };
  },
};

export default deleteContact;
