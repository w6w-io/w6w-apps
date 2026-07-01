import type { ActionDefinition } from "@w6w/types";
import { crmDelete } from "../lib/crm.ts";

interface Input {
  id: string;
}

const deleteContact: ActionDefinition<Input> = {
  key: "delete-contact",
  type: "perform",
  resource: "contact",
  title: "Delete Contact",
  description: "Archive a contact. HubSpot performs a soft-delete (recoverable for 90 days).",
  params: [
    { key: "id", label: "Contact ID", type: "string", required: true },
  ],

  async execute(input, ctx) {
    return crmDelete(ctx, "contacts", input);
  },
};

export default deleteContact;
