import type { ActionDefinition } from "@w6w/types";
import { HotmartClient, type HotmartListPage, PAYMENTS_PREFIX } from "../lib/client.ts";
import {
  paginationParams,
  paginationQuery,
  paymentTypeOptions,
  productIdParam,
  transactionParam,
  transactionStatusOptions,
} from "../lib/params.ts";

/**
 * `GET /payments/api/v1/sales/summary` — verified against
 * `developers.hotmart.com/docs/en/v1/sales/sales-summary/` on 2026-09-05.
 * Returns total commission value **per currency**, not a single number — a
 * seller paid in both BRL and USD gets one item per currency.
 */
interface Input {
  productId?: number;
  startDate?: number;
  endDate?: number;
  salesSource?: string;
  affiliateName?: string;
  paymentType?: string;
  offerCode?: string;
  transaction?: string;
  transactionStatus?: string;
  maxResults?: number;
  pageToken?: string;
}

const salesSummary: ActionDefinition<Input> = {
  key: "sales-summary",
  type: "read",
  title: "Get Sales Summary",
  description:
    "Total commission value per currency for a period. Leaving both Transaction and Transaction " +
    "Status empty returns only APPROVED/COMPLETE sales.",
  resource: "sales",
  params: [
    productIdParam,
    { key: "startDate", label: "Start date (ms epoch)", type: "number" },
    { key: "endDate", label: "End date (ms epoch)", type: "number" },
    {
      key: "salesSource",
      label: "Sales source (src)",
      type: "string",
      hint: 'The "src" tracking code from the checkout link.',
    },
    { key: "affiliateName", label: "Affiliate name", type: "string" },
    { key: "paymentType", label: "Payment type", type: "select", options: paymentTypeOptions },
    { key: "offerCode", label: "Offer code", type: "string" },
    transactionParam,
    {
      key: "transactionStatus",
      label: "Transaction status",
      type: "select",
      options: transactionStatusOptions,
    },
    ...paginationParams("Default and maximum vary by account; leave empty for the API default."),
  ],
  output: [
    { key: "items", type: "array", label: "Totals per currency" },
    { key: "page_info", type: "object", label: "Pagination" },
  ],

  async execute(input, ctx) {
    const client = new HotmartClient(ctx);
    return await client.json<HotmartListPage<unknown>>(`${PAYMENTS_PREFIX}/sales/summary`, {
      query: {
        product_id: input.productId,
        start_date: input.startDate,
        end_date: input.endDate,
        sales_source: input.salesSource,
        affiliate_name: input.affiliateName,
        payment_type: input.paymentType,
        offer_code: input.offerCode,
        transaction: input.transaction,
        transaction_status: input.transactionStatus,
        ...paginationQuery(input),
      },
    });
  },
};

export default salesSummary;
