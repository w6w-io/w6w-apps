import type { ActionDefinition } from "@w6w/types";
import { crmUpdate } from "../lib/crm.ts";

interface Input {
  id: string;
  properties: Record<string, unknown>;
  idProperty?: string;
}

const updateContact: ActionDefinition<Input> = {
  key: "update-contact",
  type: "perform",
  resource: "contact",
  title: "Update Contact",
  description: "Patch a contact's properties. Pass an object of property names → values.",
  params: [
    { key: "id", label: "Contact ID", type: "string", required: true },
    {
      key: "properties",
      label: "Properties",
      type: "json",
      required: true,
      hint: "Object of HubSpot property names → values, e.g. `{ \"firstname\": \"Ada\" }`.",
    },
    { key: "idProperty", label: "ID property", type: "string", hint: "Set to `email` to update by email." },
  ],

  async execute(input, ctx) {
    return crmUpdate(ctx, "contacts", input);
  },
};

export default updateContact;
