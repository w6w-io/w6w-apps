import type { ActionDefinition } from "@w6w/types";
import { asOptionalJson } from "../lib/params.ts";
import { compact, RazorpayClient } from "../lib/client.ts";
import { notesParam } from "../lib/params.ts";

interface LineItem {
  item_id?: string;
  name?: string;
  description?: string;
  amount?: number;
  quantity?: number;
  currency?: string;
}

/**
 * `POST /v1/invoices` — create an invoice or a payment page.
 *
 * `type: "invoice"` for a formal invoice, `type: "link"` for a simple
 * payment page. Created in `draft` status — call `invoice-issue` to send it
 * to the customer. This cannot create GST invoices (the Dashboard is
 * required for those). Maximum 50 line items.
 */
interface Input {
  type: "invoice" | "link";
  description?: string;
  customerId?: string;
  customerName?: string;
  customerEmail?: string;
  customerContact?: string;
  lineItems?: unknown;
  currency?: string;
  receipt?: string;
  comment?: string;
  terms?: string;
  partialPayment?: boolean;
  firstPaymentMinAmount?: number;
  expireBy?: number;
  notes?: unknown;
}

const invoiceCreate: ActionDefinition<Input> = {
  key: "invoice-create",
  type: "perform",
  resource: "invoice",
  title: "Create Invoice",
  description:
    "Create an invoice or payment page, in draft status. Call Issue Invoice to send it to the " +
    "customer. Cannot create GST invoices — use the Dashboard for those. Max 50 line items.",
  idempotent: false,
  params: [
    {
      key: "type",
      label: "Type",
      type: "select",
      required: true,
      default: "invoice",
      options: [
        { value: "invoice", label: "Invoice — a formal invoice document" },
        { value: "link", label: "Link — a simple payment page" },
      ],
    },
    { key: "description", label: "Description", type: "text" },
    {
      key: "customerId",
      label: "Existing customer ID",
      type: "string",
      hint: "Provide this OR the customer name/email/contact fields below, not both.",
    },
    { key: "customerName", label: "Customer name", type: "string", row: "customer" },
    { key: "customerEmail", label: "Customer email", type: "string", row: "customer" },
    { key: "customerContact", label: "Customer phone", type: "string", row: "customer" },
    {
      key: "lineItems",
      label: "Line items",
      type: "json",
      hint: "Array of up to 50 { item_id? | name, description?, amount, quantity?, currency? }. " +
        "amount is in the smallest currency sub-unit.",
    },
    { key: "currency", label: "Currency", type: "string", default: "INR" },
    { key: "receipt", label: "Receipt", type: "string", hint: "Your internal reference number." },
    { key: "comment", label: "Internal comment", type: "text", advanced: true },
    { key: "terms", label: "Payment terms", type: "text", advanced: true },
    { key: "partialPayment", label: "Allow partial payments", type: "boolean" },
    {
      key: "firstPaymentMinAmount",
      label: "Minimum first partial payment",
      type: "number",
      validation: { integer: true, min: 1 },
      advanced: true,
    },
    {
      key: "expireBy",
      label: "Expires at (Unix timestamp)",
      type: "number",
      validation: { integer: true },
      hint: "Must be at least 15 minutes in the future.",
      advanced: true,
    },
    notesParam,
  ],
  output: [
    { key: "id", type: "string", label: "Invoice ID (inv_*)" },
    { key: "status", type: "string", label: "draft on creation" },
    { key: "short_url", type: "string", label: "Hosted payment page URL — active once issued" },
    { key: "amount", type: "number", label: "Total amount (sub-unit)" },
  ],

  async execute(input, ctx) {
    const lineItems = asOptionalJson<LineItem[]>(input.lineItems, "Line items");
    const hasCustomer = input.customerName || input.customerEmail || input.customerContact;
    return await new RazorpayClient(ctx).post(
      "/invoices",
      compact({
        type: input.type,
        description: input.description,
        customer_id: input.customerId,
        customer: hasCustomer
          ? compact({
            name: input.customerName,
            email: input.customerEmail,
            contact: input.customerContact,
          })
          : undefined,
        line_items: lineItems,
        currency: input.currency,
        receipt: input.receipt,
        comment: input.comment,
        terms: input.terms,
        partial_payment: input.partialPayment,
        first_payment_min_amount: input.firstPaymentMinAmount,
        expire_by: input.expireBy,
        notes: input.notes,
      }),
    );
  },
};

export default invoiceCreate;
