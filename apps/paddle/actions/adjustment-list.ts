import type { ActionDefinition } from "@w6w/types";
import { PaddleClient, toList } from "../lib/client.ts";
import {
  adjustmentActionFilterOptions,
  idsParam,
  orderByParam,
  paginationParams,
} from "../lib/params.ts";

/**
 * `GET /adjustments` — list refunds, credits and chargebacks.
 *
 * Page size here is the smallest in the API: default 10, maximum 50.
 *
 * The `action` filter spans more than the two things an API caller can create:
 * chargebacks and their reversals are written by Paddle itself when a customer
 * disputes a charge, and this is the endpoint that surfaces them.
 */
interface Input {
  ids?: string;
  transactionId?: string;
  subscriptionId?: string;
  customerId?: string;
  action?: string[] | string;
  status?: string[] | string;
  orderBy?: string;
  perPage?: number;
  after?: string;
}

const adjustmentList: ActionDefinition<Input> = {
  key: "adjustment-list",
  type: "search",
  resource: "adjustment",
  title: "List Adjustments",
  description: "List refunds, credits and chargebacks, optionally scoped to one transaction.",
  params: [
    idsParam,
    {
      key: "transactionId",
      label: "Transaction ID",
      type: "string",
      hint: "Comma-separated for several.",
    },
    {
      key: "subscriptionId",
      label: "Subscription ID",
      type: "string",
      hint: "Comma-separated for several.",
    },
    {
      key: "customerId",
      label: "Customer ID",
      type: "string",
      hint: "Comma-separated for several.",
    },
    {
      key: "action",
      label: "Action",
      type: "multiselect",
      options: adjustmentActionFilterOptions,
    },
    {
      key: "status",
      label: "Status",
      type: "multiselect",
      options: [
        { value: "pending_approval", label: "Pending approval — a refund Paddle has not reviewed" },
        { value: "approved", label: "Approved" },
        { value: "rejected", label: "Rejected" },
        { value: "reversed", label: "Reversed" },
      ],
    },
    orderByParam("`id`"),
    ...paginationParams("Default 10, maximum 50 — the smallest page size in the Paddle API."),
  ],
  output: [
    { key: "data", type: "array", label: "Adjustments" },
    { key: "meta", type: "object", label: "Request id and pagination cursor" },
  ],

  execute(input, ctx) {
    return new PaddleClient(ctx).envelope("/adjustments", {
      query: {
        id: toList(input.ids),
        transaction_id: toList(input.transactionId),
        subscription_id: toList(input.subscriptionId),
        customer_id: toList(input.customerId),
        action: toList(input.action),
        status: toList(input.status),
        order_by: input.orderBy,
        per_page: input.perPage,
        after: input.after,
      },
    });
  },
};

export default adjustmentList;
