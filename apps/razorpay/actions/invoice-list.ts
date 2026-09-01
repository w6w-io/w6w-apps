import { compact, RazorpayClient } from "../lib/client.ts";
import type { ActionDefinition } from "@w6w/types";
import { dateRangeParams, paginationParams } from "../lib/params.ts";

/** `GET /v1/invoices` — a paginated list of invoices, filterable by type, payment, customer or subscription. */
interface Input {
  type?: "invoice" | "link";
  paymentId?: string;
  customerId?: string;
  subscriptionId?: string;
  from?: number;
  to?: number;
  count?: number;
  skip?: number;
}

const invoiceList: ActionDefinition<Input> = {
  key: "invoice-list",
  type: "search",
  resource: "invoice",
  title: "List Invoices",
  description: "Retrieve a paginated list of invoices.",
  params: [
    {
      key: "type",
      label: "Type",
      type: "select",
      options: [
        { value: "invoice", label: "Invoice" },
        { value: "link", label: "Link" },
      ],
    },
    {
      key: "paymentId",
      label: "Payment ID",
      type: "string",
      hint: "Filter by the payment used to pay them.",
    },
    { key: "customerId", label: "Customer ID", type: "string" },
    {
      key: "subscriptionId",
      label: "Subscription ID",
      type: "string",
      hint: "All invoices generated for this subscription.",
    },
    ...dateRangeParams(),
    ...paginationParams(),
  ],
  output: [
    { key: "count", type: "number", label: "Number of items in this page" },
    { key: "items", type: "array", label: "Invoices" },
  ],

  async execute(input, ctx) {
    return await new RazorpayClient(ctx).get(
      "/invoices",
      compact({
        type: input.type,
        payment_id: input.paymentId,
        customer_id: input.customerId,
        subscription_id: input.subscriptionId,
        from: input.from,
        to: input.to,
        count: input.count,
        skip: input.skip,
      }),
    );
  },
};

export default invoiceList;
