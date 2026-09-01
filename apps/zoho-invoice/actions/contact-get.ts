import type { ActionDefinition } from "@w6w/types";
import { invoiceGet, type InvoiceGetInput } from "../lib/invoice.ts";
import { organizationId, recordId } from "../lib/params.ts";

const contactGet: ActionDefinition<InvoiceGetInput> = {
  key: "contact-get",
  type: "read",
  resource: "contact",
  title: "Get Contact",
  description: "Retrieve one contact (customer or vendor) by id.",
  params: [{ ...recordId, hint: "The Zoho Invoice contact id." }, organizationId],
  output: [{ key: "contact_id", type: "string", label: "Contact ID" }],

  execute(input, ctx) {
    return invoiceGet(ctx, "/contacts", "contact", input);
  },
};

export default contactGet;
