import type { ActionDefinition } from "@w6w/types";
import { HotmartClient, type HotmartListPage, PAYMENTS_PREFIX } from "../lib/client.ts";
import {
  commissionAsOptions,
  paginationParams,
  paginationQuery,
  paymentTypeOptions,
  productIdParam,
  transactionParam,
  transactionStatusOptions,
} from "../lib/params.ts";

/**
 * `GET /payments/api/v1/sales/history` — verified against
 * `developers.hotmart.com/docs/en/v1/sales/sales-history/` on 2026-09-05.
 *
 * Undocumented but load-bearing: if neither `transaction` nor
 * `transaction_status` is sent, Hotmart silently narrows the result to
 * `APPROVED`/`COMPLETE` sales only — stated in the doc's own callout, not
 * discoverable from the response shape. A workflow expecting to see e.g.
 * `REFUNDED` sales by leaving the status filter empty would get an
 * unexpectedly short list without any error to explain why.
 */
interface Input {
  productId?: number;
  startDate?: number;
  endDate?: number;
  transaction?: string;
  buyerName?: string;
  buyerEmail?: string;
  transactionStatus?: string;
  paymentType?: string;
  offerCode?: string;
  commissionAs?: string;
  salesSource?: string;
  maxResults?: number;
  pageToken?: string;
}

const salesHistory: ActionDefinition<Input> = {
  key: "sales-history",
  type: "read",
  title: "List Sales History",
  description:
    "List sales, with per-purchase detail (product, buyer, price, payment, tracking). Leaving " +
    "both Transaction and Transaction Status empty returns only APPROVED/COMPLETE sales.",
  resource: "sales",
  params: [
    productIdParam,
    { key: "startDate", label: "Start date (ms epoch)", type: "number" },
    { key: "endDate", label: "End date (ms epoch)", type: "number" },
    transactionParam,
    { key: "buyerName", label: "Buyer name", type: "string" },
    { key: "buyerEmail", label: "Buyer email", type: "string" },
    {
      key: "transactionStatus",
      label: "Transaction status",
      type: "select",
      options: transactionStatusOptions,
    },
    { key: "paymentType", label: "Payment type", type: "select", options: paymentTypeOptions },
    { key: "offerCode", label: "Offer code", type: "string" },
    { key: "commissionAs", label: "Commission as", type: "select", options: commissionAsOptions },
    {
      key: "salesSource",
      label: "Sales source (src)",
      type: "string",
      hint:
        'The "src" tracking code from the checkout link, e.g. pay.hotmart.com/PRODUCT?src=campaign.',
    },
    ...paginationParams("Default and maximum vary by account; leave empty for the API default."),
  ],
  output: [
    { key: "items", type: "array", label: "Sales" },
    { key: "page_info", type: "object", label: "Pagination" },
  ],

  async execute(input, ctx) {
    const client = new HotmartClient(ctx);
    return await client.json<HotmartListPage<unknown>>(`${PAYMENTS_PREFIX}/sales/history`, {
      query: {
        product_id: input.productId,
        start_date: input.startDate,
        end_date: input.endDate,
        transaction: input.transaction,
        buyer_name: input.buyerName,
        buyer_email: input.buyerEmail,
        transaction_status: input.transactionStatus,
        payment_type: input.paymentType,
        offer_code: input.offerCode,
        commission_as: input.commissionAs,
        sales_source: input.salesSource,
        ...paginationQuery(input),
      },
    });
  },
};

export default salesHistory;
