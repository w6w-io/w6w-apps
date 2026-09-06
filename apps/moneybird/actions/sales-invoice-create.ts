import type { ActionDefinition } from "@w6w/types";
import { compact, jsonArray, MoneybirdClient, resolveAdministrationId } from "../lib/client.ts";
import { administrationIdParam } from "../lib/params.ts";

interface Input {
  administrationId?: string;
  contactId: string;
  reference?: string;
  invoiceDate?: string;
  currency?: string;
  paymentConditions?: string;
  discount?: number;
  lineItems: unknown;
}

/**
 * `POST /:administration_id/sales_invoices.json`.
 *
 * A created invoice starts in `draft` state with no `invoice_id` (invoice
 * number) assigned yet — Moneybird only assigns the number and sends the
 * invoice when "Send Sales Invoice" runs, or when the invoice is scheduled to
 * send. This action never sends by itself.
 *
 * `lineItems` maps to Moneybird's `details_attributes`: an array of
 * `{description, price, amount?, tax_rate_id?, ledger_account_id?,
 * project_id?, product_id?}`. It is a raw JSON param rather than a generated
 * per-line form because tax rates, ledger accounts and products are
 * per-administration data this app does not otherwise look up.
 */
const salesInvoiceCreate: ActionDefinition<Input> = {
  key: "sales-invoice-create",
  type: "perform",
  resource: "sales_invoice",
  title: "Create Sales Invoice",
  description: "Create a draft sales invoice with one or more line items. Does not send it — " +
    "use Send Sales Invoice for that.",
  // Moneybird mints a new invoice per call with no request key for dedup.
  idempotent: false,
  params: [
    administrationIdParam,
    {
      key: "contactId",
      label: "Contact ID",
      type: "string",
      required: true,
      hint: "The Moneybird id of the contact this invoice is for.",
    },
    {
      key: "reference",
      label: "Reference",
      type: "string",
      hint: "Your own reference, e.g. a PO number. Visible to the recipient.",
    },
    {
      key: "invoiceDate",
      label: "Invoice date",
      type: "date",
      hint: "Left empty, it is filled in when the invoice is sent.",
    },
    {
      key: "currency",
      label: "Currency",
      type: "string",
      hint: "ISO three-character code, e.g. EUR. Defaults to the workflow's currency.",
    },
    {
      key: "paymentConditions",
      label: "Payment conditions",
      type: "text",
      advanced: true,
      hint: 'Free-text, e.g. "Payment within 30 days". Defaults to the workflow\'s own text.',
    },
    {
      key: "discount",
      label: "Discount (%)",
      type: "number",
      advanced: true,
      hint: "Applied to the entire invoice, e.g. 10 for 10%.",
    },
    {
      key: "lineItems",
      label: "Line items",
      type: "json",
      required: true,
      hint: 'Array of objects, e.g. [{"description": "Rocking Chair", "price": 129.95}]. Each ' +
        "may also set amount, tax_rate_id, ledger_account_id, project_id or product_id.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Sales invoice ID" },
    { key: "state", type: "string", label: "State" },
  ],

  execute(input, ctx) {
    const administrationId = resolveAdministrationId(ctx, input.administrationId);
    const salesInvoice = compact({
      contact_id: input.contactId,
      reference: input.reference,
      invoice_date: input.invoiceDate,
      currency: input.currency,
      payment_conditions: input.paymentConditions,
      discount: input.discount,
      details_attributes: jsonArray(input.lineItems, "lineItems"),
    });
    return new MoneybirdClient(ctx, administrationId).request("/sales_invoices", {
      method: "POST",
      body: { sales_invoice: salesInvoice },
    });
  },
};

export default salesInvoiceCreate;
