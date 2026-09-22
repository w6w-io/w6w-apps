import type { ActionDefinition } from "@w6w/types";
import { inventoryDelete, type InventoryDeleteInput } from "../lib/inventory.ts";
import { organizationId, recordId, statusOutput } from "../lib/params.ts";

const salesorderDelete: ActionDefinition<InventoryDeleteInput> = {
  key: "salesorder-delete",
  type: "perform",
  resource: "salesorder",
  title: "Delete Sales Order",
  description: "Delete an existing sales order.",
  idempotent: true,
  params: [{ ...recordId, hint: "The Zoho Inventory sales order id." }, organizationId],
  output: statusOutput,

  execute(input, ctx) {
    return inventoryDelete(ctx, "/salesorders", input);
  },
};

export default salesorderDelete;
