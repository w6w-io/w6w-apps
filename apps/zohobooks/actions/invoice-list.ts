import type { ActionDefinition } from "@w6w/types";
import { booksList, type BooksListInput, type BooksListResult } from "../lib/books.ts";
import { organizationId, pageParams } from "../lib/params.ts";

interface Input extends BooksListInput {
  customerId?: string;
  status?: string;
}

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

const invoiceList: ActionDefinition<Input, BooksListResult<Record<string, unknown>>> = {
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
    return booksList(ctx, "/invoices", "invoices", input, {
      customer_id: input.customerId,
      status: input.status,
    });
  },
};

export default invoiceList;
