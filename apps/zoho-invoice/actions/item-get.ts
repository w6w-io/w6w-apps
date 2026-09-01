import type { ActionDefinition } from "@w6w/types";
import { invoiceGet, type InvoiceGetInput } from "../lib/invoice.ts";
import { organizationId, recordId } from "../lib/params.ts";

const itemGet: ActionDefinition<InvoiceGetInput> = {
  key: "item-get",
  type: "read",
  resource: "item",
  title: "Get Item",
  description: "Retrieve one catalog item by id.",
  params: [{ ...recordId, hint: "The Zoho Invoice item id." }, organizationId],
  output: [{ key: "item_id", type: "string", label: "Item ID" }],

  execute(input, ctx) {
    return invoiceGet(ctx, "/items", "item", input);
  },
};

export default itemGet;
