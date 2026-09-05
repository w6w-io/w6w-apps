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
 * `GET /payments/api/v1/sales/price/details` — verified against
 * `developers.hotmart.com/docs/en/v1/sales/sales-price-details/` on
 * 2026-09-05. Base, total, VAT, fee and coupon amounts can each be in a
 * **different currency** per the documented example response (base in MXN,
 * VAT in BRL, fee in USD) — never assume the sale's own currency applies
 * across every one of these fields.
 */
interface Input {
  productId?: number;
  startDate?: number;
  endDate?: number;
  transaction?: string;
  transactionStatus?: string;
  paymentType?: string;
  maxResults?: number;
  pageToken?: string;
}

const salesPriceDetails: ActionDefinition<Input> = {
  key: "sales-price-details",
  type: "read",
  title: "Get Sales Price Details",
  description:
    "Breakdown of a purchase's amount: base (commission basis), total, VAT, Hotmart fee and any " +
    "coupon discount — each field can carry its own currency. Leaving both Transaction and " +
    "Transaction Status empty returns only APPROVED/COMPLETE sales.",
  resource: "sales",
  params: [
    productIdParam,
    { key: "startDate", label: "Start date (ms epoch)", type: "number" },
    { key: "endDate", label: "End date (ms epoch)", type: "number" },
    transactionParam,
    {
      key: "transactionStatus",
      label: "Transaction status",
      type: "select",
      options: transactionStatusOptions,
    },
    { key: "paymentType", label: "Payment type", type: "select", options: paymentTypeOptions },
    ...paginationParams("Default and maximum vary by account; leave empty for the API default."),
  ],
  output: [
    { key: "items", type: "array", label: "Sales with price breakdown" },
    { key: "page_info", type: "object", label: "Pagination" },
  ],

  async execute(input, ctx) {
    const client = new HotmartClient(ctx);
    return await client.json<HotmartListPage<unknown>>(`${PAYMENTS_PREFIX}/sales/price/details`, {
      query: {
        product_id: input.productId,
        start_date: input.startDate,
        end_date: input.endDate,
        transaction: input.transaction,
        transaction_status: input.transactionStatus,
        payment_type: input.paymentType,
        ...paginationQuery(input),
      },
    });
  },
};

export default salesPriceDetails;
