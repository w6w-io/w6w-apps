import type { ActionDefinition } from "@w6w/types";
import { InsightlyClient } from "../lib/client.ts";

interface Input {
  contactId: number;
}

const contactDelete: ActionDefinition<Input> = {
  key: "contact-delete",
  type: "perform",
  resource: "contact",
  title: "Delete Contact",
  description: "Permanently delete a contact. Insightly has no trash to recover it from.",
  idempotent: true,
  params: [
    { key: "contactId", label: "Contact ID", type: "number", required: true },
  ],
  output: [],

  async execute(input, ctx) {
    await new InsightlyClient(ctx).request(`/Contacts/${input.contactId}`, { method: "DELETE" });
    return {};
  },
};

export default contactDelete;
