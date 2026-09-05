import type { ActionDefinition } from "@w6w/types";
import { HotmartClient, type HotmartListPage, PAYMENTS_PREFIX } from "../lib/client.ts";
import { paginationParams, paginationQuery, productIdParam } from "../lib/params.ts";

/**
 * `GET /payments/api/v1/subscriptions/summary` — verified against
 * `developers.hotmart.com/docs/en/v1/subscription/get-subscription-summary/`
 * on 2026-09-05.
 *
 * The vendor's own doc states this data lags up to 24 hours behind reality,
 * and recommends `subscribers-list` (Get Subscriptions) instead when you
 * need the current state right now. This endpoint's value is what
 * `subscribers-list` does not carry: `last_recurrency`/`unpaid_recurrencies`
 * detail across the three recurring-payment shapes Hotmart bills as —
 * ordinary Subscription, Smart Installment, and Smart Recovery — which is
 * what the retention/recovery tutorials are built on.
 */
interface Input {
  productId?: number;
  subscriberCode?: number;
  accessionDate?: number;
  endAccessionDate?: number;
  dateNextCharge?: number;
  maxResults?: number;
  pageToken?: string;
}

const subscriptionSummary: ActionDefinition<Input> = {
  key: "subscription-summary",
  type: "read",
  title: "Get Subscription Summary",
  description:
    "Recurrence/recovery status for each subscription, Smart Installment and Smart Recovery. " +
    "Data lags up to 24h; use List Subscriptions for the current status instead.",
  resource: "subscriptions",
  params: [
    productIdParam,
    { key: "subscriberCode", label: "Subscriber code", type: "number" },
    {
      key: "accessionDate",
      label: "Accession date from (ms epoch)",
      type: "number",
      hint: "Defaults to 30 days ago when omitted.",
    },
    { key: "endAccessionDate", label: "Cancellation requested from (ms epoch)", type: "number" },
    { key: "dateNextCharge", label: "Next charge attempt from (ms epoch)", type: "number" },
    ...paginationParams("Default and maximum vary by account; leave empty for the API default."),
  ],
  output: [
    { key: "items", type: "array", label: "Subscription summaries" },
    { key: "page_info", type: "object", label: "Pagination" },
  ],

  async execute(input, ctx) {
    const client = new HotmartClient(ctx);
    return await client.json<HotmartListPage<unknown>>(`${PAYMENTS_PREFIX}/subscriptions/summary`, {
      query: {
        product_id: input.productId,
        subscriber_code: input.subscriberCode,
        accession_date: input.accessionDate,
        end_accession_date: input.endAccessionDate,
        date_next_charge: input.dateNextCharge,
        ...paginationQuery(input),
      },
    });
  },
};

export default subscriptionSummary;
