import type { ActionDefinition } from "@w6w/types";
import { idempotencyHeaders, resolveAccountId, WhopClient } from "../lib/client.ts";
import { accountIdParam, currencyParam, productIdParam } from "../lib/params.ts";

interface Input {
  accountId?: string;
  productId: string;
  title?: string;
  planType: string;
  currency?: string;
  initialPrice?: number;
  renewalPrice?: number;
  billingPeriod?: number;
  trialPeriodDays?: number;
  expirationDays?: number;
  visibility?: string;
}

const planCreate: ActionDefinition<Input> = {
  key: "plan-create",
  type: "perform",
  resource: "plan",
  title: "Create Plan",
  description: "Create a pricing plan for a product: billing interval, price and availability.",
  idempotent: true,
  params: [
    accountIdParam,
    productIdParam,
    { key: "title", label: "Title", type: "string" },
    {
      key: "planType",
      label: "Plan type",
      type: "select",
      required: true,
      options: [
        { value: "renewal", label: "Recurring (renewal)" },
        { value: "one_time", label: "One-time" },
      ],
    },
    currencyParam,
    {
      key: "initialPrice",
      label: "Initial price",
      type: "number",
      hint: "Amount charged immediately, in the plan's currency, e.g. 10.43 for $10.43.",
    },
    {
      key: "renewalPrice",
      label: "Renewal price",
      type: "number",
      hint: "Amount charged each billing period for recurring plans.",
    },
    {
      key: "billingPeriod",
      label: "Billing period (days)",
      type: "number",
      validation: { integer: true, min: 1 },
      hint: "e.g. 30 for monthly, 365 for annual. Recurring plans only.",
    },
    {
      key: "trialPeriodDays",
      label: "Trial period (days)",
      type: "number",
      validation: { integer: true, min: 0 },
    },
    {
      key: "expirationDays",
      label: "Expiration (days)",
      type: "number",
      validation: { integer: true, min: 0 },
      hint: "Access duration before the membership expires.",
    },
    {
      key: "visibility",
      label: "Visibility",
      type: "select",
      options: [
        { value: "visible", label: "Visible" },
        { value: "hidden", label: "Hidden" },
        { value: "archived", label: "Archived" },
      ],
    },
  ],
  output: [{ key: "data", type: "object", label: "The created plan" }],

  execute(input, ctx) {
    return new WhopClient(ctx).post(
      "/plans",
      {
        account_id: resolveAccountId(input.accountId, ctx),
        product_id: input.productId,
        title: input.title,
        plan_type: input.planType,
        currency: input.currency,
        initial_price: input.initialPrice,
        renewal_price: input.renewalPrice,
        billing_period: input.billingPeriod,
        trial_period_days: input.trialPeriodDays,
        expiration_days: input.expirationDays,
        visibility: input.visibility,
      },
      idempotencyHeaders(ctx)["Idempotency-Key"],
    );
  },
};

export default planCreate;
