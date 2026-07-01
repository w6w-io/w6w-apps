import type { ActionDefinition } from "@w6w/types";
import { crmGet, type CrmGetInput } from "../lib/crm.ts";

const getContact: ActionDefinition<CrmGetInput> = {
  key: "get-contact",
  type: "read",
  resource: "contact",
  title: "Get Contact",
  description: "Fetch a contact by ID (or by any unique property via `idProperty`, e.g. `email`).",
  params: [
    { key: "id", label: "Contact ID", type: "string", required: true },
    { key: "properties", label: "Properties", type: "string", hint: "Comma-separated list." },
    { key: "propertiesWithHistory", label: "Properties with history", type: "string" },
    { key: "associations", label: "Associations", type: "string", hint: "e.g. `companies,deals`" },
    { key: "archived", label: "Include archived", type: "boolean", default: false },
    { key: "idProperty", label: "ID property", type: "string", hint: "Set to `email` to look up by email." },
  ],

  async execute(input, ctx) {
    return crmGet(ctx, "contacts", input);
  },
};

export default getContact;
