import type { ActionDefinition } from "@w6w/types";
import { TeachableClient } from "../lib/client.ts";
import { paginationParams } from "../lib/params.ts";

/**
 * `GET /v1/transactions` — sales transactions for the school. The vendor
 * notes a new transaction can take up to two minutes to appear here from the
 * time of sale.
 */
interface Input {
  userId?: number;
  affiliateId?: number;
  courseId?: number;
  pricingPlanId?: number;
  isFullyRefunded?: boolean;
  isChargeback?: boolean;
  start?: string;
  end?: string;
  page?: number;
  per?: number;
}

const transactionList: ActionDefinition<Input> = {
  key: "transaction-list",
  type: "read",
  resource: "transaction",
  title: "List Transactions",
  description: "Fetch sales transactions made in your school. New transactions can take up " +
    "to two minutes to appear after the sale.",
  params: [
    { key: "userId", label: "User ID", type: "number" },
    { key: "affiliateId", label: "Affiliate ID", type: "number" },
    { key: "courseId", label: "Course ID", type: "number" },
    { key: "pricingPlanId", label: "Pricing Plan ID", type: "number" },
    { key: "isFullyRefunded", label: "Fully refunded only", type: "boolean" },
    { key: "isChargeback", label: "Chargebacks only", type: "boolean" },
    {
      key: "start",
      label: "Start",
      type: "datetime",
      hint: "Beginning of the time period (exclusive), ISO 8601.",
    },
    {
      key: "end",
      label: "End",
      type: "datetime",
      hint: "End of the time period (inclusive), ISO 8601.",
    },
    ...paginationParams(20, "Teachable's own docs disagree whether the default is 20 or 25."),
  ],
  output: [
    { key: "transactions", type: "array", label: "Transactions" },
    { key: "meta", type: "object", label: "Pagination metadata" },
  ],

  execute(input, ctx) {
    return new TeachableClient(ctx).json("/transactions", {
      query: {
        user_id: input.userId,
        affiliate_id: input.affiliateId,
        course_id: input.courseId,
        pricing_plan_id: input.pricingPlanId,
        is_fully_refunded: input.isFullyRefunded,
        is_chargeback: input.isChargeback,
        start: input.start,
        end: input.end,
        page: input.page,
        per: input.per ?? 20,
      },
    });
  },
};

export default transactionList;
