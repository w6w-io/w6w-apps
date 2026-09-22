import type { ActionDefinition } from "@w6w/types";
import { inventoryCreate, type InventoryCreateInput } from "../lib/inventory.ts";
import { dataFields, organizationId } from "../lib/params.ts";

/**
 * `customer_id` and `line_items` are the two fields Zoho Inventory documents
 * as required for a sales order; each line item needs `item_id` and
 * `quantity`, with `rate` optional.
 */
const salesorderCreate: ActionDefinition<InventoryCreateInput> = {
  key: "salesorder-create",
  type: "perform",
  resource: "salesorder",
  title: "Create Sales Order",
  description:
    "Create a sales order. `customer_id` and `line_items` are required; each line item needs " +
    '`item_id` and `quantity`, with `rate` optional, e.g. { "customer_id": "982000000000123", ' +
    '"line_items": [{ "item_id": "982000000000456", "quantity": 2 }] }.',
  idempotent: false,
  params: [dataFields, organizationId],
  output: [{ key: "salesorder_id", type: "string", label: "Sales order ID" }],

  execute(input, ctx) {
    return inventoryCreate(ctx, "/salesorders", "salesorder", input);
  },
};

export default salesorderCreate;
