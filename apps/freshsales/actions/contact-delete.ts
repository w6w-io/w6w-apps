import type { ActionDefinition } from "@w6w/types";
import { FreshsalesClient } from "../lib/client.ts";

interface Input {
  contactId: number;
}

const contactDelete: ActionDefinition<Input> = {
  key: "contact-delete",
  type: "perform",
  resource: "contact",
  title: "Delete Contact",
  description: "Permanently delete a contact.",
  idempotent: true,
  params: [
    { key: "contactId", label: "Contact ID", type: "number", required: true },
  ],
  output: [{ key: "deleted", type: "boolean", label: "Deleted" }],

  async execute(input, ctx) {
    // Verified: a successful delete's response body is the bare JSON literal
    // `true`, not an object wrapping a "contact" key.
    const result = await new FreshsalesClient(ctx).request<boolean>(
      `/contacts/${input.contactId}`,
      { method: "DELETE" },
    );
    return { deleted: result === true };
  },
};

export default contactDelete;
