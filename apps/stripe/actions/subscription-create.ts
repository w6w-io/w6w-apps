import type { ActionDefinition } from "@w6w/types";
import { metadata, StripeClient, unset } from "../lib/client.ts";
import { metadataParam } from "../lib/params.ts";

interface Input {
  customerId: string;
  priceId: string;
  quantity?: number;
  trialPeriodDays?: number;
  trialEnd?: string;
  collectionMethod?: string;
  coupon?: string;
  promotionCode?: string;
  defaultPaymentMethod?: string;
  prorationBehavior?: string;
  metadata?: unknown;
}

/**
 * A single-price subscription, which covers the common case. Stripe accepts an
 * `items[]` array for multi-price subscriptions — model that with a follow-up
 * action if it is needed rather than turning this form into a matrix.
 */
const subscriptionCreate: ActionDefinition<Input> = {
  key: "subscription-create",
  type: "perform",
  resource: "subscription",
  title: "Create Subscription",
  description: "Subscribe a customer to a price.",
  idempotent: true,
  params: [
    {
      key: "customerId",
      label: "Customer ID",
      type: "string",
      required: true,
      placeholder: "cus_…",
    },
    { key: "priceId", label: "Price ID", type: "string", required: true, placeholder: "price_…" },
    {
      key: "quantity",
      label: "Quantity",
      type: "number",
      default: 1,
      validation: { min: 1, integer: true },
    },
    {
      key: "trialPeriodDays",
      label: "Trial days",
      type: "number",
      validation: { min: 1, integer: true },
      hint: "Free trial before the first charge.",
    },
    {
      key: "trialEnd",
      label: "Trial end",
      type: "string",
      hint: 'Unix timestamp, or the literal "now" to end the trial immediately.',
    },
    {
      key: "collectionMethod",
      label: "Collection",
      type: "select",
      default: "charge_automatically",
      options: [
        { value: "charge_automatically", label: "Charge automatically" },
        { value: "send_invoice", label: "Send invoice" },
      ],
    },
    {
      key: "coupon",
      label: "Coupon",
      type: "string",
      placeholder: "coupon_id",
      hint: "Deprecated by Stripe in favor of Promotion Code below, but still accepted.",
    },
    {
      key: "promotionCode",
      label: "Promotion code",
      type: "string",
      placeholder: "promo_…",
      hint: "Applied as `discounts: [{ promotion_code }]`, Stripe's current path.",
    },
    {
      key: "defaultPaymentMethod",
      label: "Default payment method",
      type: "string",
      placeholder: "pm_…",
    },
    {
      key: "prorationBehavior",
      label: "Proration behavior",
      type: "select",
      options: [
        { value: "create_prorations", label: "Create prorations" },
        { value: "none", label: "None" },
        { value: "always_invoice", label: "Always invoice" },
      ],
    },
    metadataParam,
  ],
  output: [
    { key: "id", type: "string", label: "Subscription ID" },
    { key: "status", type: "string", label: "Status" },
    { key: "current_period_end", type: "number", label: "Period end (unix seconds)" },
    { key: "latest_invoice", type: "string", label: "Latest invoice ID" },
  ],

  execute(input, ctx) {
    const discounts = input.promotionCode ? [{ promotion_code: input.promotionCode }] : undefined;
    return new StripeClient(ctx).request("/subscriptions", {
      form: {
        customer: input.customerId,
        items: [{ price: input.priceId, quantity: input.quantity }],
        trial_period_days: input.trialPeriodDays,
        trial_end: unset(input.trialEnd),
        collection_method: unset(input.collectionMethod),
        coupon: unset(input.coupon),
        discounts,
        default_payment_method: unset(input.defaultPaymentMethod),
        proration_behavior: unset(input.prorationBehavior),
        metadata: metadata(input.metadata),
      },
    });
  },
};

export default subscriptionCreate;
