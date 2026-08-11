import type { ActionDefinition } from "@w6w/types";
import { AircallClient, encodeId } from "../lib/client.ts";
import { contactIdParam } from "../lib/params.ts";

interface Input {
  contactId: string;
}

/**
 * `DELETE /v1/contacts/:id` — delete a shared Contact. Answers **204**.
 *
 * Only shared Contacts can be deleted, which is every Contact this API can see
 * in the first place. Calls that referenced the Contact are not deleted.
 */
const contactDelete: ActionDefinition<Input> = {
  key: "contact-delete",
  type: "perform",
  resource: "contact",
  title: "Delete Contact",
  description: "Delete a shared Contact. Calls that referenced it are unaffected.",
  // Safe to retry in the sense that matters for a retry policy: the end state is
  // the same, and a replay against an already-deleted Contact fails with a 404
  // rather than destroying anything else.
  idempotent: true,
  params: [contactIdParam],
  output: [{ key: "status", type: "number", label: "HTTP status — 204 on success" }],

  async execute(input, ctx) {
    const client = new AircallClient(ctx);
    ctx.log("warn", "deleting contact", { contactId: input.contactId });
    const status = await client.status(`/contacts/${encodeId(input.contactId)}`, {
      method: "DELETE",
    });
    return { status };
  },
};

export default contactDelete;
