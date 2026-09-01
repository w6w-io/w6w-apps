import type { ActionDefinition } from "@w6w/types";
import { compact, FreshBooksClient, jsonArray, jsonObject, unset } from "../lib/client.ts";
import { additionalFields } from "../lib/params.ts";

interface Input {
  customerId: string;
  lines: unknown;
  currencyCode?: string;
  notes?: string;
  terms?: string;
  poNumber?: string;
  additionalFields?: unknown;
}

const invoiceCreate: ActionDefinition<Input> = {
  key: "invoice-create",
  type: "perform",
  resource: "invoice",
  title: "Create Invoice",
  description:
    'Create a draft invoice for a client. Invoices are created in "Draft" status — use "Send Invoice" to mark it sent.',
  // FreshBooks mints a new invoice id per call and offers no request key, so
  // a retry creates a duplicate invoice (also, without an explicit
  // invoice_number, retries can race the auto-increment and 409 rather than
  // duplicate — see the "Creating Multiple Invoices" note in the reference).
  idempotent: false,
  params: [
    { key: "customerId", label: "Client ID", type: "string", required: true },
    {
      key: "lines",
      label: "Lines",
      type: "json",
      required: true,
      hint:
        'JSON array of invoice line objects, e.g. [{ "name": "Consulting", "qty": 1, "unit_cost": { "amount": "100", "code": "USD" } }].',
    },
    { key: "currencyCode", label: "Currency code", type: "string", advanced: true },
    { key: "notes", label: "Notes", type: "text", advanced: true },
    { key: "terms", label: "Terms", type: "text", advanced: true },
    { key: "poNumber", label: "PO number", type: "string", advanced: true },
    additionalFields,
  ],
  output: [{ key: "invoice", type: "object", label: "Invoice" }],

  execute(input, ctx) {
    return new FreshBooksClient(ctx).request("accounting", "/invoices/invoices", {
      method: "POST",
      body: {
        invoice: {
          customerid: input.customerId,
          lines: jsonArray(input.lines, "lines"),
          ...compact({
            currency_code: unset(input.currencyCode),
            notes: unset(input.notes),
            terms: unset(input.terms),
            po_number: unset(input.poNumber),
          }),
          ...jsonObject(input.additionalFields, "additionalFields"),
        },
      },
    });
  },
};

export default invoiceCreate;
