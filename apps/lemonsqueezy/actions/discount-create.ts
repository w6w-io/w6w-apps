import type { ActionDefinition } from "@w6w/types";
import {
  jsonApiBody,
  LemonSqueezyClient,
  relationshipRef,
  relationshipRefs,
} from "../lib/client.ts";
import { discountAmountTypeOptions, discountDurationOptions } from "../lib/params.ts";

/**
 * `POST /v1/discounts` — `store` is a required relationship; `variants` is a
 * relationship used only when `isLimitedToProducts` is set.
 */
interface Input {
  storeId: string;
  name: string;
  code: string;
  amount: number;
  amountType: string;
  isLimitedToProducts?: boolean;
  variantIds?: string;
  isLimitedRedemptions?: boolean;
  maxRedemptions?: number;
  startsAt?: string;
  expiresAt?: string;
  duration?: string;
  durationInMonths?: number;
  testMode?: boolean;
}

const discountCreate: ActionDefinition<Input> = {
  key: "discount-create",
  type: "perform",
  resource: "discount",
  title: "Create Discount",
  description: "Create a discount code under a store.",
  idempotent: false,
  params: [
    { key: "storeId", label: "Store ID", type: "string", required: true },
    { key: "name", label: "Name", type: "string", required: true },
    {
      key: "code",
      label: "Code",
      type: "string",
      required: true,
      validation: { minLength: 3, maxLength: 256 },
      hint: "Uppercase letters and numbers, 3-256 characters.",
    },
    {
      key: "amount",
      label: "Amount",
      type: "number",
      required: true,
      validation: { integer: true, min: 1 },
      hint: "1000 means $10 when fixed, or 10 means 10% when percent.",
    },
    {
      key: "amountType",
      label: "Amount type",
      type: "select",
      required: true,
      options: discountAmountTypeOptions,
    },
    {
      key: "isLimitedToProducts",
      label: "Limit to products/variants",
      type: "boolean",
    },
    {
      key: "variantIds",
      label: "Variant IDs",
      type: "string",
      hint: "Comma-separated variant IDs this discount applies to. Required when limiting to " +
        "products/variants.",
      dependsOn: ["isLimitedToProducts"],
    },
    { key: "isLimitedRedemptions", label: "Limit redemptions", type: "boolean" },
    {
      key: "maxRedemptions",
      label: "Max redemptions",
      type: "number",
      validation: { integer: true, min: 1 },
      dependsOn: ["isLimitedRedemptions"],
    },
    { key: "startsAt", label: "Starts at", type: "datetime" },
    { key: "expiresAt", label: "Expires at", type: "datetime" },
    {
      key: "duration",
      label: "Subscription duration",
      type: "select",
      options: discountDurationOptions,
      hint: "Defaults to `once` if omitted.",
    },
    {
      key: "durationInMonths",
      label: "Duration in months",
      type: "number",
      validation: { integer: true, min: 1 },
      hint: "Used when duration is `repeating`. For yearly subscriptions, use years x 12. " +
        "Defaults to 1.",
      dependsOn: ["duration"],
    },
    { key: "testMode", label: "Test mode only", type: "boolean" },
  ],
  output: [{ key: "data", type: "object", label: "The created Discount object" }],

  execute(input, ctx) {
    return new LemonSqueezyClient(ctx).request("/discounts", {
      method: "POST",
      body: jsonApiBody(
        "discounts",
        {
          name: input.name,
          code: input.code,
          amount: input.amount,
          amount_type: input.amountType,
          is_limited_to_products: input.isLimitedToProducts,
          is_limited_redemptions: input.isLimitedRedemptions,
          max_redemptions: input.maxRedemptions,
          starts_at: input.startsAt,
          expires_at: input.expiresAt,
          duration: input.duration,
          duration_in_months: input.durationInMonths,
          test_mode: input.testMode,
        },
        {
          store: relationshipRef("stores", input.storeId),
          ...(input.isLimitedToProducts
            ? { variants: relationshipRefs("variants", input.variantIds) }
            : {}),
        },
      ),
    });
  },
};

export default discountCreate;
