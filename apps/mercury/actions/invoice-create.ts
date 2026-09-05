import type { ActionDefinition } from "@w6w/types";
import { MercuryClient } from "../lib/client.ts";

/**
 * `POST /ar/invoices` — create an accounts-receivable invoice.
 *
 * Required per the OpenAPI document (`ApiV1ArInvoiceCreateRequest`):
 * `dueDate`, `invoiceDate`, `customerId`, `ccEmails` (array, may be empty),
 * `destinationAccountId`, `creditCardEnabled`, `achDebitEnabled`,
 * `useRealAccountNumber`, `lineItems` (array of `{name, unitPrice,
 * quantity}`). `sendEmailOption` defaults to sending the invoice
 * immediately when omitted — this action defaults it to `DontSend` instead,
 * so a workflow testing invoice creation does not accidentally email a real
 * customer; set Send immediately explicitly to opt in.
 */
interface LineItem {
  name: string;
  unitPrice: number;
  quantity: number;
  salesTaxRate?: number;
}

interface Input {
  customerId: string;
  destinationAccountId: string;
  dueDate: string;
  invoiceDate: string;
  lineItems: LineItem[];
  ccEmails?: string[];
  invoiceNumber?: string;
  poNumber?: string;
  internalNote?: string;
  payerMemo?: string;
  sendEmailNow: boolean;
  achDebitEnabled: boolean;
  creditCardEnabled: boolean;
  useRealAccountNumber: boolean;
}

const invoiceCreate: ActionDefinition<Input> = {
  key: "invoice-create",
  type: "perform",
  resource: "invoice",
  title: "Create Invoice",
  description: "Create an accounts-receivable invoice for a customer.",
  idempotent: false,
  params: [
    {
      key: "customerId",
      label: "Customer ID",
      type: "string",
      required: true,
      hint: "From customer-list or customer-create.",
    },
    {
      key: "destinationAccountId",
      label: "Destination account ID",
      type: "string",
      required: true,
      hint: "Mercury checking or savings account where invoice payments are deposited.",
    },
    { key: "dueDate", label: "Due date", type: "date", required: true, placeholder: "2026-12-31" },
    {
      key: "invoiceDate",
      label: "Invoice date",
      type: "date",
      required: true,
      placeholder: "2026-11-01",
    },
    {
      key: "lineItems",
      label: "Line items",
      type: "array",
      required: true,
      item: {
        type: "object",
        fields: [
          { key: "name", label: "Name", type: "string", required: true },
          { key: "unitPrice", label: "Unit price (USD)", type: "number", required: true },
          { key: "quantity", label: "Quantity", type: "number", required: true },
          { key: "salesTaxRate", label: "Sales tax rate", type: "number" },
        ],
      },
    },
    { key: "ccEmails", label: "CC emails", type: "array", item: { type: "string" } },
    { key: "invoiceNumber", label: "Invoice number", type: "string", advanced: true },
    { key: "poNumber", label: "PO number", type: "string", advanced: true },
    {
      key: "internalNote",
      label: "Internal note (not visible to payer)",
      type: "text",
      advanced: true,
    },
    { key: "payerMemo", label: "Payer memo", type: "text", advanced: true },
    {
      key: "sendEmailNow",
      label: "Send immediately",
      type: "boolean",
      default: false,
      hint:
        "Mercury's own default is to email the customer immediately on creation; this action defaults it OFF so testing does not send a real invoice email.",
    },
    { key: "achDebitEnabled", label: "Allow ACH debit payment", type: "boolean", default: false },
    {
      key: "creditCardEnabled",
      label: "Allow credit card payment",
      type: "boolean",
      default: false,
      hint: "Requires Stripe to be set up for the Mercury account.",
    },
    {
      key: "useRealAccountNumber",
      label: "Show real account/routing number",
      type: "boolean",
      default: false,
      hint:
        "Off uses a virtual account number instead — the vendor's own recommendation ('safer, preferred in most cases').",
    },
  ],
  output: [{ key: "invoice", type: "object", label: "Created invoice" }],

  async execute(input, ctx) {
    const invoice = await new MercuryClient(ctx).json("/ar/invoices", {
      method: "POST",
      body: {
        customerId: input.customerId,
        destinationAccountId: input.destinationAccountId,
        dueDate: input.dueDate,
        invoiceDate: input.invoiceDate,
        lineItems: input.lineItems,
        ccEmails: input.ccEmails ?? [],
        invoiceNumber: input.invoiceNumber,
        poNumber: input.poNumber,
        internalNote: input.internalNote,
        payerMemo: input.payerMemo,
        sendEmailOption: input.sendEmailNow ? "SendNow" : "DontSend",
        achDebitEnabled: input.achDebitEnabled,
        creditCardEnabled: input.creditCardEnabled,
        useRealAccountNumber: input.useRealAccountNumber,
      },
    });
    return { invoice };
  },
};

export default invoiceCreate;
