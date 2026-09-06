import type { ActionDefinition } from "@w6w/types";
import { Bitrix24Client } from "../lib/client.ts";
import { idParam } from "../lib/params.ts";

interface Input {
  id: number;
}

/**
 * `crm.contact.get` — verified against
 * `api-reference/crm/contacts/crm-contact-get.html`. DEPRECATED by the vendor
 * in favor of `crm.item.get` (see `README.md`).
 */
const action: ActionDefinition<Input, Record<string, unknown>> = {
  key: "contact-get",
  type: "read",
  resource: "contact",
  title: "Get Contact",
  description: "Retrieve a contact by its identifier.",
  params: [idParam("Contact")],
  output: [
    { key: "ID", type: "number", label: "ID" },
    { key: "NAME", type: "string", label: "First Name" },
    { key: "LAST_NAME", type: "string", label: "Last Name" },
    { key: "TYPE_ID", type: "string", label: "Contact Type" },
    { key: "POST", type: "string", label: "Position" },
    { key: "ASSIGNED_BY_ID", type: "string", label: "Assigned To (User ID)" },
  ],

  async execute(input, ctx) {
    const id = Number(input.id);
    if (!Number.isFinite(id)) throw new Error("`id` must be a number");
    return await new Bitrix24Client(ctx).call<Record<string, unknown>>("crm.contact.get", { id });
  },
};

export default action;
