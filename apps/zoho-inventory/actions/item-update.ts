import type { ActionDefinition } from "@w6w/types";
import { inventoryUpdate, type InventoryUpdateInput } from "../lib/inventory.ts";
import { dataFields, organizationId, recordId } from "../lib/params.ts";

const itemUpdate: ActionDefinition<InventoryUpdateInput> = {
  key: "item-update",
  type: "perform",
  resource: "item",
  title: "Update Item",
  description: "Update a catalog item's fields.",
  idempotent: true,
  params: [
    { ...recordId, hint: "The Zoho Inventory item id." },
    {
      ...dataFields,
      hint: 'Only the fields to change, e.g. { "rate": 135 }. Same optional fields as Create Item.',
    },
    organizationId,
  ],
  output: [{ key: "item_id", type: "string", label: "Item ID" }],

  execute(input, ctx) {
    return inventoryUpdate(ctx, "/items", "item", input);
  },
};

export default itemUpdate;
