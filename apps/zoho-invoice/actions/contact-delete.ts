import type { ActionDefinition } from "@w6w/types";
import { invoiceDelete, type InvoiceDeleteInput } from "../lib/invoice.ts";
import { organizationId, recordId, statusOutput } from "../lib/params.ts";

/**
 * Zoho Invoice refuses this with error code 3000 ("This contact cannot be
 * deleted since you have recorded transactions for it") when the contact
 * has associated invoices/estimates/payments — documented on
 * `https://www.zoho.com/invoice/api/v3/contacts/`'s own error-code table.
 */
const contactDelete: ActionDefinition<InvoiceDeleteInput> = {
  key: "contact-delete",
  type: "perform",
  resource: "contact",
  title: "Delete Contact",
  description:
    "Delete a contact. Fails if the contact has recorded transactions (invoices, estimates, " +
    "payments).",
  idempotent: true,
  params: [{ ...recordId, hint: "The Zoho Invoice contact id." }, organizationId],
  output: statusOutput,

  execute(input, ctx) {
    return invoiceDelete(ctx, "/contacts", input);
  },
};

export default contactDelete;
