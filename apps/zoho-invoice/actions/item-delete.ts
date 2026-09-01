import type { ActionDefinition } from "@w6w/types";
import { invoiceDelete, type InvoiceDeleteInput } from "../lib/invoice.ts";
import { organizationId, recordId, statusOutput } from "../lib/params.ts";

const itemDelete: ActionDefinition<InvoiceDeleteInput> = {
  key: "item-delete",
  type: "perform",
  resource: "item",
  title: "Delete Item",
  description: "Delete a catalog item.",
  idempotent: true,
  params: [{ ...recordId, hint: "The Zoho Invoice item id." }, organizationId],
  output: statusOutput,

  execute(input, ctx) {
    return invoiceDelete(ctx, "/items", input);
  },
};

export default itemDelete;
