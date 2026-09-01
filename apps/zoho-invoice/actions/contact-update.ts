import type { ActionDefinition } from "@w6w/types";
import { invoiceUpdate, type InvoiceUpdateInput } from "../lib/invoice.ts";
import { dataFields, organizationId, recordId } from "../lib/params.ts";

const contactUpdate: ActionDefinition<InvoiceUpdateInput> = {
  key: "contact-update",
  type: "perform",
  resource: "contact",
  title: "Update Contact",
  description: "Update fields on an existing contact.",
  idempotent: true,
  params: [{ ...recordId, hint: "The Zoho Invoice contact id." }, dataFields, organizationId],
  output: [{ key: "contact_id", type: "string", label: "Contact ID" }],

  execute(input, ctx) {
    return invoiceUpdate(ctx, "/contacts", "contact", input);
  },
};

export default contactUpdate;
