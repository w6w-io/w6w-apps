import type { ActionDefinition } from "@w6w/types";
import { invoiceUpdate, type InvoiceUpdateInput } from "../lib/invoice.ts";
import { dataFields, organizationId, recordId } from "../lib/params.ts";

const itemUpdate: ActionDefinition<InvoiceUpdateInput> = {
  key: "item-update",
  type: "perform",
  resource: "item",
  title: "Update Item",
  description: "Update fields on an existing catalog item.",
  idempotent: true,
  params: [{ ...recordId, hint: "The Zoho Invoice item id." }, dataFields, organizationId],
  output: [{ key: "item_id", type: "string", label: "Item ID" }],

  execute(input, ctx) {
    return invoiceUpdate(ctx, "/items", "item", input);
  },
};

export default itemUpdate;
