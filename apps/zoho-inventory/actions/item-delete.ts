import type { ActionDefinition } from "@w6w/types";
import { inventoryDelete, type InventoryDeleteInput } from "../lib/inventory.ts";
import { organizationId, recordId, statusOutput } from "../lib/params.ts";

const itemDelete: ActionDefinition<InventoryDeleteInput> = {
  key: "item-delete",
  type: "perform",
  resource: "item",
  title: "Delete Item",
  description: "Delete an existing catalog item.",
  idempotent: true,
  params: [{ ...recordId, hint: "The Zoho Inventory item id." }, organizationId],
  output: statusOutput,

  execute(input, ctx) {
    return inventoryDelete(ctx, "/items", input);
  },
};

export default itemDelete;
