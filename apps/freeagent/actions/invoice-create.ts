import type { ActionDefinition } from "@w6w/types";
import { compact, FreeAgentClient, jsonArray, jsonObject, ref } from "../lib/client.ts";

interface Input {
  contactId: string;
  datedOn?: string;
  invoiceItems: unknown;
  additionalFields?: unknown;
}

const invoiceCreate: ActionDefinition<Input> = {
  key: "invoice-create",
  type: "perform",
  resource: "invoice",
  title: "Create Invoice",
  description:
    "Create an invoice. FreeAgent always creates it as Draft — use Send Invoice Email or a status transition to move it on.",
  // FreeAgent mints a new invoice id per call and offers no request key, so
  // a retry creates a duplicate draft invoice.
  idempotent: false,
  params: [
    { key: "contactId", label: "Contact ID", type: "string", required: true },
    { key: "datedOn", label: "Dated on", type: "date" },
    {
      key: "invoiceItems",
      label: "Invoice items",
      type: "json",
      required: true,
      hint:
        'JSON array of invoice item objects, e.g. [{ "description": "Consulting", "item_type": "Hours", "price": "100.0", "quantity": "2" }].',
    },
    {
      key: "additionalFields",
      label: "Additional fields",
      type: "json",
      advanced: true,
      hint:
        'Merged into the invoice object using FreeAgent\'s field names, e.g. { "reference": "003", "payment_terms_in_days": 14, "comments": "Thanks!" }.',
    },
  ],
  output: [{ key: "invoice", type: "object", label: "Invoice" }],

  execute(input, ctx) {
    return new FreeAgentClient(ctx).request("/invoices", {
      method: "POST",
      body: {
        invoice: {
          contact: ref("contacts", input.contactId),
          ...compact({ dated_on: input.datedOn }),
          invoice_items: jsonArray(input.invoiceItems, "invoiceItems"),
          ...jsonObject(input.additionalFields, "additionalFields"),
        },
      },
    });
  },
};

export default invoiceCreate;
