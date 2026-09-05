import type { ActionDefinition } from "@w6w/types";
import { assertIdentifier, RespondioClient } from "../lib/client.ts";

/**
 * `DELETE /contact/{identifier}` — `ContactClient.delete` in the official SDK.
 * Marked idempotent: the end state (contact gone) is the same whether this
 * runs once or is retried.
 */
interface Input {
  identifier: string;
}

const contactDelete: ActionDefinition<Input> = {
  key: "contact-delete",
  type: "perform",
  resource: "contact",
  title: "Delete Contact",
  description: "Permanently delete a contact.",
  idempotent: true,
  params: [
    { key: "identifier", label: "Contact identifier", type: "string", required: true },
  ],
  output: [{ key: "contactId", type: "number", label: "Contact ID" }],

  execute(input, ctx) {
    const identifier = assertIdentifier(input.identifier);
    return new RespondioClient(ctx).delete(`/contact/${identifier}`);
  },
};

export default contactDelete;
