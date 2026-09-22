import type { ActionDefinition } from "@w6w/types";
import { inventoryGet, type InventoryGetInput } from "../lib/inventory.ts";
import { organizationId, recordId } from "../lib/params.ts";

const contactGet: ActionDefinition<InventoryGetInput> = {
  key: "contact-get",
  type: "read",
  resource: "contact",
  title: "Get Contact",
  description: "Retrieve one Contact (customer or vendor) by id.",
  params: [{ ...recordId, hint: "The Zoho Inventory contact id." }, organizationId],
  output: [{ key: "contact_id", type: "string", label: "Contact ID" }],

  execute(input, ctx) {
    return inventoryGet(ctx, "/contacts", "contact", input);
  },
};

export default contactGet;
