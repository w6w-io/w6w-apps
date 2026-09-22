import type { ActionDefinition } from "@w6w/types";
import {
  inventoryList,
  type InventoryListInput,
  type InventoryListResult,
} from "../lib/inventory.ts";
import { organizationId, pageParams } from "../lib/params.ts";

const salesorderList: ActionDefinition<
  InventoryListInput,
  InventoryListResult<Record<string, unknown>>
> = {
  key: "salesorder-list",
  type: "read",
  resource: "salesorder",
  title: "List Sales Orders",
  description: "List the organization's sales orders.",
  params: [organizationId, ...pageParams],
  output: [
    { key: "data", type: "array", label: "Sales orders" },
    { key: "pageContext", type: "object", label: "Pagination info" },
  ],

  execute(input, ctx) {
    return inventoryList(ctx, "/salesorders", "salesorders", input);
  },
};

export default salesorderList;
