import type { ActionDefinition } from "@w6w/types";
import { HotmartClient, type HotmartListPage, PAYMENTS_PREFIX } from "../lib/client.ts";
import {
  commissionAsOptions,
  paginationParams,
  paginationQuery,
  productIdParam,
  transactionParam,
  transactionStatusOptions,
} from "../lib/params.ts";

/**
 * `GET /payments/api/v1/sales/commissions` — verified against
 * `developers.hotmart.com/docs/en/v1/sales/sales-commissions/` on 2026-09-05.
 * Breaks a single transaction's commission down per participant
 * (producer/co-producer/affiliate), each in their own settlement currency —
 * not the sale's own currency.
 */
interface Input {
  productId?: number;
  startDate?: number;
  endDate?: number;
  transaction?: string;
  commissionAs?: string;
  transactionStatus?: string;
  maxResults?: number;
  pageToken?: string;
}

const salesCommissions: ActionDefinition<Input> = {
  key: "sales-commissions",
  type: "read",
  title: "List Sales Commissions",
  description:
    "Per-participant commission breakdown for each sale (producer, co-producer, affiliate), " +
    "each in its own payout currency. Leaving both Transaction and Transaction Status empty " +
    "returns only APPROVED/COMPLETE sales.",
  resource: "sales",
  params: [
    productIdParam,
    { key: "startDate", label: "Start date (ms epoch)", type: "number" },
    { key: "endDate", label: "End date (ms epoch)", type: "number" },
    transactionParam,
    { key: "commissionAs", label: "Commission as", type: "select", options: commissionAsOptions },
    {
      key: "transactionStatus",
      label: "Transaction status",
      type: "select",
      options: transactionStatusOptions,
    },
    ...paginationParams("Default and maximum vary by account; leave empty for the API default."),
  ],
  output: [
    { key: "items", type: "array", label: "Sales with commission breakdown" },
    { key: "page_info", type: "object", label: "Pagination" },
  ],

  async execute(input, ctx) {
    const client = new HotmartClient(ctx);
    return await client.json<HotmartListPage<unknown>>(`${PAYMENTS_PREFIX}/sales/commissions`, {
      query: {
        product_id: input.productId,
        start_date: input.startDate,
        end_date: input.endDate,
        transaction: input.transaction,
        commission_as: input.commissionAs,
        transaction_status: input.transactionStatus,
        ...paginationQuery(input),
      },
    });
  },
};

export default salesCommissions;
