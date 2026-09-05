import type { Param } from "@w6w/types";

/**
 * Invoice Ninja's page-number pagination — verified against the `page_meta` /
 * `per_page_meta` shared parameters on every list operation in the OpenAPI
 * document (e.g. `GET /api/v1/clients`). There is no cursor; `page` and
 * `per_page` are both plain integers, default 1 and 20 respectively.
 */
export const pagination: Param[] = [
  { key: "page", label: "Page", type: "number", default: 1, row: "page" },
  {
    key: "perPage",
    label: "Per page",
    type: "number",
    default: 20,
    row: "page",
    hint: "Default 20.",
  },
];

/**
 * The `status` filter every list operation shares — verified against the
 * `status` shared parameter's description: a comma-separated string of
 * `active` / `archived` / `deleted`.
 */
export const statusFilter: Param = {
  key: "status",
  label: "Status",
  type: "multiselect",
  advanced: true,
  options: [
    { value: "active", label: "Active" },
    { value: "archived", label: "Archived" },
    { value: "deleted", label: "Deleted" },
  ],
  hint: "Leave unset to return active records only.",
};

/** Hashed-id output field, shared by every resource this app exposes. */
export const idOutput = [{ key: "id", type: "string" as const, label: "Hashed ID" }];

export const clientOutput = [
  { key: "id", type: "string" as const, label: "Client ID" },
  { key: "name", type: "string" as const, label: "Name" },
  { key: "balance", type: "number" as const, label: "Balance" },
];

export const invoiceOutput = [
  { key: "id", type: "string" as const, label: "Invoice ID" },
  { key: "number", type: "string" as const, label: "Invoice number" },
  { key: "status_id", type: "string" as const, label: "Status" },
  { key: "amount", type: "number" as const, label: "Amount" },
  { key: "balance", type: "number" as const, label: "Balance" },
];

export const quoteOutput = [
  { key: "id", type: "string" as const, label: "Quote ID" },
  { key: "number", type: "string" as const, label: "Quote number" },
  { key: "status_id", type: "string" as const, label: "Status" },
  { key: "amount", type: "number" as const, label: "Amount" },
];

export const paymentOutput = [
  { key: "id", type: "string" as const, label: "Payment ID" },
  { key: "amount", type: "number" as const, label: "Amount" },
  { key: "transaction_reference", type: "string" as const, label: "Transaction reference" },
];

export const productOutput = [
  { key: "id", type: "string" as const, label: "Product ID" },
  { key: "product_key", type: "string" as const, label: "Product key (SKU)" },
  { key: "price", type: "number" as const, label: "Price" },
];

export const taskOutput = [
  { key: "id", type: "string" as const, label: "Task ID" },
  { key: "description", type: "string" as const, label: "Description" },
  { key: "status_id", type: "string" as const, label: "Status" },
];

export const expenseOutput = [
  { key: "id", type: "string" as const, label: "Expense ID" },
  { key: "amount", type: "number" as const, label: "Amount" },
  { key: "date", type: "string" as const, label: "Date" },
];

/**
 * Line items shared by invoices and quotes — verified against the
 * `InvoiceItem` schema both `InvoiceRequest.line_items` and
 * `QuoteRequest.line_items` reference. Exposed as one `json` field rather than
 * itemised controls: the schema carries 17 optional properties per line and a
 * document can hold any number of lines.
 */
export const lineItemsParam: Param = {
  key: "lineItems",
  label: "Line items",
  type: "json",
  hint: 'JSON array of Invoice Ninja line items, e.g. [{ "product_key": "consulting", ' +
    '"notes": "Design work", "cost": 100, "quantity": 2 }].',
};
