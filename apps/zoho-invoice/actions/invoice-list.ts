import type { ActionDefinition } from "@w6w/types";
import { invoiceList, type InvoiceListInput, type InvoiceListResult } from "../lib/invoice.ts";
import { organizationId, pageParams } from "../lib/params.ts";

interface Input extends InvoiceListInput {
  customerId?: string;
  status?: string;
}

/**
 * Confirmed 2026-09-01 against `https://www.zoho.com/invoice/api/v3/invoices/`'s
 * own "List invoices" query parameters — the same eight status values Zoho
 * Books documents for itself.
 */
const STATUS_OPTIONS = [
  "sent",
  "draft",
  "overdue",
  "paid",
  "void",
  "unpaid",
  "partially_paid",
  "viewed",
];

const invoiceListAction: ActionDefinition<Input, InvoiceListResult<Record<string, unknown>>> = {
  key: "invoice-list",
  type: "read",
  resource: "invoice",
  title: "List Invoices",
  description: "List invoices, with optional customer/status filters.",
  params: [
    organizationId,
    { key: "customerId", label: "Customer ID", type: "string", hint: "Filter to one customer." },
    {
      key: "status",
      label: "Status",
      type: "select",
      options: STATUS_OPTIONS.map((value) => ({ value, label: value })),
    },
    ...pageParams,
  ],
  output: [
    { key: "data", type: "array", label: "Invoices" },
    { key: "pageContext", type: "object", label: "Pagination info" },
  ],

  execute(input, ctx) {
    return invoiceList(ctx, "/invoices", "invoices", input, {
      customer_id: input.customerId,
      status: input.status,
    });
  },
};

export default invoiceListAction;
