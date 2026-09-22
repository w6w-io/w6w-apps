import type { ActionDefinition } from "@w6w/types";
import { inventoryGet, type InventoryGetInput } from "../lib/inventory.ts";
import { organizationId, recordId } from "../lib/params.ts";

const itemGet: ActionDefinition<InventoryGetInput> = {
  key: "item-get",
  type: "read",
  resource: "item",
  title: "Get Item",
  description: "Retrieve one catalog item by id.",
  params: [{ ...recordId, hint: "The Zoho Inventory item id." }, organizationId],
  output: [{ key: "item_id", type: "string", label: "Item ID" }],

  execute(input, ctx) {
    return inventoryGet(ctx, "/items", "item", input);
  },
};

export default itemGet;
