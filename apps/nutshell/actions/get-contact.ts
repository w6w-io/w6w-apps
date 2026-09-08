import type { ActionDefinition } from "@w6w/types";
import { NutshellClient, type NutshellEntity, toId } from "../lib/client.ts";

interface Input {
  contactId: string | number;
}

/** `getContact(contactId, rev?)` — one Contact (person) by ID. */
const getContact: ActionDefinition<Input, NutshellEntity> = {
  key: "get-contact",
  type: "read",
  resource: "contact",
  title: "Get Contact",
  description: 'Fetch one Contact (person — called "People" in the Nutshell UI) by ID.',
  params: [
    { key: "contactId", label: "Contact ID", type: "string", required: true },
  ],
  output: [
    { key: "id", type: "number", label: "Contact ID" },
    { key: "rev", type: "string", label: "Rev (needed to later update this Contact)" },
    { key: "name", type: "object", label: "Name" },
  ],

  execute(input, ctx) {
    return new NutshellClient(ctx).call<NutshellEntity>("getContact", {
      contactId: toId(input.contactId),
    });
  },
};

export default getContact;
