import type { ActionDefinition } from "@w6w/types";
import {
  inventoryList,
  type InventoryListInput,
  type InventoryListResult,
} from "../lib/inventory.ts";
import { organizationId, pageParams } from "../lib/params.ts";

/**
 * Warehouses are what makes Zoho Inventory its own product rather than an
 * accounting add-on: stock is tracked *per location*, so a quantity without a
 * location is only half an answer. `GET /locations` is the only Location
 * endpoint this app exposes — creating or deleting a warehouse is an
 * administrative change to how the whole account's stock is reported, not
 * something a workflow should do implicitly.
 */
const locationList: ActionDefinition<
  InventoryListInput,
  InventoryListResult<Record<string, unknown>>
> = {
  key: "location-list",
  type: "read",
  resource: "location",
  title: "List Locations",
  description: "List the warehouses/locations this organization tracks stock in.",
  params: [organizationId, ...pageParams],
  output: [
    { key: "data", type: "array", label: "Locations" },
    { key: "pageContext", type: "object", label: "Pagination info" },
  ],

  execute(input, ctx) {
    return inventoryList(ctx, "/locations", "locations", input);
  },
};

export default locationList;
