import type { ActionDefinition } from "@w6w/types";
import {
  inventoryList,
  type InventoryListInput,
  type InventoryListResult,
} from "../lib/inventory.ts";
import { organizationId, pageParams } from "../lib/params.ts";

const itemList: ActionDefinition<InventoryListInput, InventoryListResult<Record<string, unknown>>> =
  {
    key: "item-list",
    type: "read",
    resource: "item",
    title: "List Items",
    description: "List the products and services in the item catalog.",
    params: [organizationId, ...pageParams],
    output: [
      { key: "data", type: "array", label: "Items" },
      { key: "pageContext", type: "object", label: "Pagination info" },
    ],

    execute(input, ctx) {
      return inventoryList(ctx, "/items", "items", input);
    },
  };

export default itemList;
