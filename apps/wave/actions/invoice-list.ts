import type { ActionDefinition } from "@w6w/types";
import { compact, INVOICE_FIELDS, PAGE_INFO, unwrapBusiness, WaveClient } from "../lib/client.ts";

interface Input {
  businessId: string;
  customerId?: string;
  status?: string;
  invoiceNumber?: string;
  invoiceDateStart?: string;
  invoiceDateEnd?: string;
  page?: number;
  pageSize?: number;
}

const QUERY = `
  query ListInvoices(
    $businessId: ID!
    $page: Int
    $pageSize: Int
    $customerId: ID
    $status: InvoiceStatus
    $invoiceNumber: String
    $invoiceDateStart: Date
    $invoiceDateEnd: Date
  ) {
    business(id: $businessId) {
      id
      invoices(
        page: $page
        pageSize: $pageSize
        customerId: $customerId
        status: $status
        invoiceNumber: $invoiceNumber
        invoiceDateStart: $invoiceDateStart
        invoiceDateEnd: $invoiceDateEnd
      ) {
        ${PAGE_INFO}
        edges { node { ${INVOICE_FIELDS} } }
      }
    }
  }
`;

const invoiceList: ActionDefinition<Input> = {
  key: "invoice-list",
  type: "search",
  resource: "invoice",
  title: "List Invoices",
  description: "List invoices for a business, optionally filtered by customer, status or number.",
  params: [
    { key: "businessId", label: "Business ID", type: "string", required: true },
    { key: "customerId", label: "Customer ID", type: "string" },
    {
      key: "status",
      label: "Status",
      type: "select",
      options: [
        "DRAFT",
        "OVERDUE",
        "OVERPAID",
        "PAID",
        "PARTIAL",
        "SAVED",
        "SENT",
        "UNPAID",
        "VIEWED",
      ].map((v) => ({ value: v, label: v })),
    },
    { key: "invoiceNumber", label: "Invoice number", type: "string", advanced: true },
    { key: "invoiceDateStart", label: "Invoice date from", type: "date", advanced: true },
    { key: "invoiceDateEnd", label: "Invoice date to", type: "date", advanced: true },
    { key: "page", label: "Page", type: "number", default: 1 },
    { key: "pageSize", label: "Page size", type: "number", default: 20 },
  ],
  output: [
    { key: "edges", type: "array", label: "Invoices, each wrapped in a `node`" },
    { key: "pageInfo", type: "object", label: "currentPage / totalPages / totalCount" },
  ],

  async execute(input, ctx) {
    const data = await new WaveClient(ctx).query<Record<string, unknown>>(
      QUERY,
      compact({
        businessId: input.businessId,
        page: input.page,
        pageSize: input.pageSize,
        customerId: input.customerId,
        status: input.status,
        invoiceNumber: input.invoiceNumber,
        invoiceDateStart: input.invoiceDateStart,
        invoiceDateEnd: input.invoiceDateEnd,
      }),
    );
    return unwrapBusiness(data, "invoices");
  },
};

export default invoiceList;
