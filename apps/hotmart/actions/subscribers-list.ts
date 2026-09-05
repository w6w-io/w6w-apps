import type { ActionDefinition } from "@w6w/types";
import { HotmartClient, type HotmartListPage, PAYMENTS_PREFIX } from "../lib/client.ts";
import {
  paginationParams,
  paginationQuery,
  productIdParam,
  subscriptionStatusOptions,
} from "../lib/params.ts";

/**
 * `GET /payments/api/v1/subscriptions` — verified against
 * `developers.hotmart.com/docs/en/v1/subscription/get-subscribers/` on
 * 2026-09-05.
 *
 * `status` and `plan` are documented as **repeatable** query keys
 * (`?status=CANCELLED_BY_SELLER&status=ACTIVE`), not a single comma-joined
 * value — {@link HotmartClient} appends each array element as its own
 * `status=` pair to match.
 */
interface Input {
  productId?: number;
  plan?: string[];
  planId?: number;
  accessionDate?: number;
  endAccessionDate?: number;
  status?: string[];
  subscriberCode?: string;
  subscriberEmail?: string;
  transaction?: string;
  trial?: boolean;
  cancelationDate?: number;
  endCancelationDate?: number;
  dateNextCharge?: number;
  endDateNextCharge?: number;
  maxResults?: number;
  pageToken?: string;
}

const subscribersList: ActionDefinition<Input> = {
  key: "subscribers-list",
  type: "read",
  title: "List Subscriptions",
  description: "List subscribers/subscriptions with detailed status, plan, product and price info.",
  resource: "subscriptions",
  params: [
    productIdParam,
    {
      key: "plan",
      label: "Plan name",
      type: "string",
      repeat: true,
      hint: "Filter by one or more plan names.",
    },
    { key: "planId", label: "Plan ID", type: "number" },
    {
      key: "accessionDate",
      label: "Accession date from (ms epoch)",
      type: "number",
      hint: "Defaults to 30 days ago when omitted.",
    },
    { key: "endAccessionDate", label: "Accession date to (ms epoch)", type: "number" },
    {
      key: "status",
      label: "Status",
      type: "multiselect",
      options: subscriptionStatusOptions,
    },
    { key: "subscriberCode", label: "Subscriber code", type: "string" },
    { key: "subscriberEmail", label: "Subscriber email", type: "string" },
    { key: "transaction", label: "Transaction", type: "string" },
    { key: "trial", label: "Trial only", type: "boolean" },
    {
      key: "cancelationDate",
      label: "Cancelled from (ms epoch)",
      type: "number",
      hint: "Defaults to 30 days ago when omitted.",
    },
    { key: "endCancelationDate", label: "Cancelled to (ms epoch)", type: "number" },
    { key: "dateNextCharge", label: "Next charge from (ms epoch)", type: "number" },
    { key: "endDateNextCharge", label: "Next charge to (ms epoch)", type: "number" },
    ...paginationParams("Default and maximum vary by account; leave empty for the API default."),
  ],
  output: [
    { key: "items", type: "array", label: "Subscriptions" },
    { key: "page_info", type: "object", label: "Pagination" },
  ],

  async execute(input, ctx) {
    const client = new HotmartClient(ctx);
    return await client.json<HotmartListPage<unknown>>(`${PAYMENTS_PREFIX}/subscriptions`, {
      query: {
        product_id: input.productId,
        plan: input.plan,
        plan_id: input.planId,
        accession_date: input.accessionDate,
        end_accession_date: input.endAccessionDate,
        status: input.status,
        subscriber_code: input.subscriberCode,
        subscriber_email: input.subscriberEmail,
        transaction: input.transaction,
        trial: input.trial,
        cancelation_date: input.cancelationDate,
        end_cancelation_date: input.endCancelationDate,
        date_next_charge: input.dateNextCharge,
        end_date_next_charge: input.endDateNextCharge,
        ...paginationQuery(input),
      },
    });
  },
};

export default subscribersList;
