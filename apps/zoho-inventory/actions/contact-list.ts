import type { ActionDefinition } from "@w6w/types";
import {
  inventoryList,
  type InventoryListInput,
  type InventoryListResult,
} from "../lib/inventory.ts";
import { organizationId, pageParams } from "../lib/params.ts";

/**
 * Pagination and the organization are the only query parameters this app
 * exposes on lists — the Contact attribute table's filters (`contact_type`,
 * `search_text`, `filter_by`, ...) are deliberately not modelled, the same
 * scope `zohobooks`'s contact-list keeps.
 */
const contactList: ActionDefinition<
  InventoryListInput,
  InventoryListResult<Record<string, unknown>>
> = {
  key: "contact-list",
  type: "read",
  resource: "contact",
  title: "List Contacts",
  description: "List the organization's customers and vendors.",
  params: [organizationId, ...pageParams],
  output: [
    { key: "data", type: "array", label: "Contacts" },
    { key: "pageContext", type: "object", label: "Pagination info" },
  ],

  execute(input, ctx) {
    return inventoryList(ctx, "/contacts", "contacts", input);
  },
};

export default contactList;
