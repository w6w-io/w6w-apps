import type { ActionDefinition } from "@w6w/types";
import { inventoryUpdate, type InventoryUpdateInput } from "../lib/inventory.ts";
import { dataFields, organizationId, recordId } from "../lib/params.ts";

const contactUpdate: ActionDefinition<InventoryUpdateInput> = {
  key: "contact-update",
  type: "perform",
  resource: "contact",
  title: "Update Contact",
  description: "Update a Contact's fields.",
  idempotent: true,
  params: [
    { ...recordId, hint: "The Zoho Inventory contact id." },
    {
      ...dataFields,
      hint:
        'Only the fields to change, e.g. { "company_name": "Acme Corporation" }. Same optional ' +
        "fields as Create Contact.",
    },
    organizationId,
  ],
  output: [{ key: "contact_id", type: "string", label: "Contact ID" }],

  execute(input, ctx) {
    return inventoryUpdate(ctx, "/contacts", "contact", input);
  },
};

export default contactUpdate;
