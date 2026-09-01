import type { ActionDefinition } from "@w6w/types";
import { FreeAgentClient } from "../lib/client.ts";

interface Input {
  contactId: string;
}

const contactDelete: ActionDefinition<Input> = {
  key: "contact-delete",
  type: "perform",
  resource: "contact",
  title: "Delete Contact",
  description: "Delete a contact.",
  // A repeated DELETE against an id that's already gone answers 404, not a
  // second deletion — the end state is identical either way.
  idempotent: true,
  params: [
    { key: "contactId", label: "Contact ID", type: "string", required: true },
  ],
  output: [],

  async execute(input, ctx) {
    await new FreeAgentClient(ctx).request(`/contacts/${input.contactId}`, { method: "DELETE" });
    return {};
  },
};

export default contactDelete;
