import type { ActionDefinition } from "@w6w/types";
import { inventoryUpdate, type InventoryUpdateInput } from "../lib/inventory.ts";
import { dataFields, organizationId, recordId } from "../lib/params.ts";

const salesorderUpdate: ActionDefinition<InventoryUpdateInput> = {
  key: "salesorder-update",
  type: "perform",
  resource: "salesorder",
  title: "Update Sales Order",
  description: "Update a sales order's fields, including replacing its line items.",
  idempotent: true,
  params: [
    { ...recordId, hint: "The Zoho Inventory sales order id." },
    {
      ...dataFields,
      hint: 'Only the fields to change, e.g. { "line_items": [{ "item_id": "982000000000456", ' +
        '"quantity": 3 }] }. Same shape as Create Sales Order.',
    },
    organizationId,
  ],
  output: [{ key: "salesorder_id", type: "string", label: "Sales order ID" }],

  execute(input, ctx) {
    return inventoryUpdate(ctx, "/salesorders", "salesorder", input);
  },
};

export default salesorderUpdate;
