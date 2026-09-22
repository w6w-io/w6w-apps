import type { ActionDefinition } from "@w6w/types";
import { inventoryDelete, type InventoryDeleteInput } from "../lib/inventory.ts";
import { organizationId, recordId, statusOutput } from "../lib/params.ts";

const contactDelete: ActionDefinition<InventoryDeleteInput> = {
  key: "contact-delete",
  type: "perform",
  resource: "contact",
  title: "Delete Contact",
  description: "Delete an existing Contact.",
  idempotent: true,
  params: [{ ...recordId, hint: "The Zoho Inventory contact id." }, organizationId],
  output: statusOutput,

  execute(input, ctx) {
    return inventoryDelete(ctx, "/contacts", input);
  },
};

export default contactDelete;
