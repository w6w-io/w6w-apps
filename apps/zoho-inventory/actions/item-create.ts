import type { ActionDefinition } from "@w6w/types";
import { inventoryCreate, type InventoryCreateInput } from "../lib/inventory.ts";
import { dataFields, organizationId } from "../lib/params.ts";

/**
 * Zoho Inventory's Item attribute table makes `name` the only required field.
 * `rate`, `sku`, `item_type` ("inventory" | "sales" | "purchases" |
 * "sales_and_purchases") and `product_type` ("goods" | "service") are the
 * documented optional ones this app's description names.
 */
const itemCreate: ActionDefinition<InventoryCreateInput> = {
  key: "item-create",
  type: "perform",
  resource: "item",
  title: "Create Item",
  description:
    'Create a product or service. `name` is required; `rate`, `sku`, `item_type` ("inventory" | ' +
    '"sales" | "purchases" | "sales_and_purchases") and `product_type` ("goods" | "service") are ' +
    'optional, e.g. { "name": "Hard Drive", "rate": 120, "item_type": "sales" }.',
  idempotent: false,
  params: [dataFields, organizationId],
  output: [{ key: "item_id", type: "string", label: "Item ID" }],

  execute(input, ctx) {
    return inventoryCreate(ctx, "/items", "item", input);
  },
};

export default itemCreate;
