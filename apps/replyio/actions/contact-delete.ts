import type { ActionDefinition } from "@w6w/types";
import { ReplyClient } from "../lib/client.ts";
import { contactIdParam } from "../lib/params.ts";

/**
 * `DELETE /v3/contacts/{id}` — delete one contact by id. Answers `204` with no
 * body. Requires `contacts:write`.
 *
 * Idempotent: deleting an already-deleted contact is the same end state (Reply
 * answers `404`, which this action treats as success rather than an error —
 * see below).
 */
interface Input {
  id: number;
}

const contactDelete: ActionDefinition<Input> = {
  key: "contact-delete",
  type: "perform",
  resource: "contact",
  title: "Delete Contact",
  description: "Delete one contact by its Reply id.",
  idempotent: true,
  params: [contactIdParam],
  output: [
    { key: "id", type: "number", label: "Contact ID" },
    { key: "deleted", type: "boolean", label: "Whether the contact was deleted" },
  ],

  async execute(input, ctx) {
    const client = new ReplyClient(ctx);
    try {
      await client.status(`/contacts/${input.id}`, { method: "DELETE" });
    } catch (err) {
      // A contact already gone is the idempotent success case, not a failure.
      if (!(err instanceof Error) || !/Reply 404/.test(err.message)) throw err;
    }
    return { id: input.id, deleted: true };
  },
};

export default contactDelete;
