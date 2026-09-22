import type { ActionDefinition } from "@w6w/types";
import { inventoryGet, type InventoryGetInput } from "../lib/inventory.ts";
import { organizationId, recordId } from "../lib/params.ts";

const salesorderGet: ActionDefinition<InventoryGetInput> = {
  key: "salesorder-get",
  type: "read",
  resource: "salesorder",
  title: "Get Sales Order",
  description: "Retrieve one sales order, including its line items, by id.",
  params: [{ ...recordId, hint: "The Zoho Inventory sales order id." }, organizationId],
  output: [{ key: "salesorder_id", type: "string", label: "Sales order ID" }],

  execute(input, ctx) {
    return inventoryGet(ctx, "/salesorders", "salesorder", input);
  },
};

export default salesorderGet;
