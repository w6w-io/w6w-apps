import type { ActionDefinition } from "@w6w/types";
import { invoiceList, type InvoiceListInput, type InvoiceListResult } from "../lib/invoice.ts";
import { organizationId, pageParams } from "../lib/params.ts";

interface Input extends InvoiceListInput {
  searchText?: string;
}

const itemList: ActionDefinition<Input, InvoiceListResult<Record<string, unknown>>> = {
  key: "item-list",
  type: "read",
  resource: "item",
  title: "List Items",
  description: "List catalog items, with an optional search text filter.",
  params: [
    organizationId,
    {
      key: "searchText",
      label: "Search text",
      type: "string",
      hint: "Matches item name, SKU or description.",
    },
    ...pageParams,
  ],
  output: [
    { key: "data", type: "array", label: "Items" },
    { key: "pageContext", type: "object", label: "Pagination info" },
  ],

  execute(input, ctx) {
    return invoiceList(ctx, "/items", "items", input, { search_text: input.searchText });
  },
};

export default itemList;
