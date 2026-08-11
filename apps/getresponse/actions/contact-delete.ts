import type { ActionDefinition } from "@w6w/types";
import { GetResponseClient } from "../lib/client.ts";

/**
 * `DELETE /contacts/{contactId}` — remove a contact.
 *
 * `messageId` and `ipAddress` exist to record *why* the contact was removed —
 * which message they unsubscribed from, and from where. They are optional, but
 * a deletion recorded without them loses that provenance permanently, and
 * unsubscribe records are exactly the kind of thing an audit asks about later.
 *
 * Idempotent in the sense the runtime cares about: a retry cannot delete a
 * second contact.
 */
interface Input {
  contactId: string;
  messageId?: string;
  ipAddress?: string;
}

const contactDelete: ActionDefinition<Input> = {
  key: "contact-delete",
  type: "perform",
  resource: "contact",
  title: "Delete Contact",
  description: "Remove a contact, optionally recording which message and IP prompted it.",
  idempotent: true,
  params: [
    { key: "contactId", label: "Contact ID", type: "string", required: true },
    {
      key: "messageId",
      label: "Message ID",
      type: "string",
      hint: "The message the contact unsubscribed from, recorded against the removal.",
    },
    {
      key: "ipAddress",
      label: "IP address",
      type: "string",
      hint: "Where the unsubscribe came from. Worth recording for consent audits.",
    },
  ],
  output: [],

  execute(input, ctx) {
    return new GetResponseClient(ctx).request(
      `/contacts/${encodeURIComponent(input.contactId)}`,
      { method: "DELETE", query: { messageId: input.messageId, ipAddress: input.ipAddress } },
    );
  },
};

export default contactDelete;
