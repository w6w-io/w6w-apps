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
 * `GET /payments/api/v1/sales/users` — verified against
 * `developers.hotmart.com/docs/en/v1/sales/sales-users/` on 2026-09-05.
 * Returns full contact/address detail for every participant in a
 * transaction (buyer, producer, co-producer, affiliate) — not just the buyer.
 */
interface Input {
  productId?: number;
  startDate?: number;
  endDate?: number;
  buyerEmail?: string;
  buyerName?: string;
  salesSource?: string;
  transaction?: string;
  affiliateName?: string;
  commissionAs?: string;
  transactionStatus?: string;
  maxResults?: number;
  pageToken?: string;
}

const salesUsers: ActionDefinition<Input> = {
  key: "sales-users",
  type: "read",
  title: "List Sales Participants",
  description:
    "List the buyers, producers, co-producers and affiliates involved in each sale, with contact " +
    "and address detail. Leaving both Transaction and Transaction Status empty returns only " +
    "APPROVED/COMPLETE sales.",
  resource: "sales",
  params: [
    productIdParam,
    { key: "startDate", label: "Start date (ms epoch)", type: "number" },
    { key: "endDate", label: "End date (ms epoch)", type: "number" },
    { key: "buyerEmail", label: "Buyer email", type: "string" },
    { key: "buyerName", label: "Buyer name", type: "string" },
    {
      key: "salesSource",
      label: "Sales source (src)",
      type: "string",
      hint: 'The "src" tracking code from the checkout link.',
    },
    transactionParam,
    { key: "affiliateName", label: "Affiliate name", type: "string" },
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
    { key: "items", type: "array", label: "Sales with participants" },
    { key: "page_info", type: "object", label: "Pagination" },
  ],

  async execute(input, ctx) {
    const client = new HotmartClient(ctx);
    return await client.json<HotmartListPage<unknown>>(`${PAYMENTS_PREFIX}/sales/users`, {
      query: {
        product_id: input.productId,
        start_date: input.startDate,
        end_date: input.endDate,
        buyer_email: input.buyerEmail,
        buyer_name: input.buyerName,
        sales_source: input.salesSource,
        transaction: input.transaction,
        affiliate_name: input.affiliateName,
        commission_as: input.commissionAs,
        transaction_status: input.transactionStatus,
        ...paginationQuery(input),
      },
    });
  },
};

export default salesUsers;
