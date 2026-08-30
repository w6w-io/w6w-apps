import type { ActionDefinition } from "@w6w/types";
import { idempotencyHeaders, WhopClient } from "../lib/client.ts";
import { accountIdRequiredParam, promoCodeTypeOptions } from "../lib/params.ts";

/**
 * `POST /promo_codes`.
 *
 * ## `amount_off` is written whole, read as a fraction
 *
 * The create request's own example for a percentage code is `amount_off: 25`
 * (meaning 25% off) — but the PromoCode entity schema documents that same
 * field, once stored, as "represented as a decimal fraction" with the example
 * `amount_off: 0.25`. Writing and reading disagree on the unit for the exact
 * same discount, so this hint states both.
 */
interface Input {
  accountId: string;
  code: string;
  promoType: string;
  amountOff: number;
  baseCurrency?: string;
  promoDurationMonths: number;
  newUsersOnly: boolean;
  oneCustomer?: boolean;
  productId?: string;
  expiresAt?: string;
  stock?: number;
  unlimitedStock?: boolean;
}

const promoCodeCreate: ActionDefinition<Input> = {
  key: "promo-code-create",
  type: "perform",
  resource: "promo-code",
  title: "Create Promo Code",
  description: "Create a promo code (percentage or flat-amount discount) for an account.",
  idempotent: true,
  params: [
    accountIdRequiredParam,
    { key: "code", label: "Code", type: "string", required: true, placeholder: "AFFILIATE25" },
    {
      key: "promoType",
      label: "Type",
      type: "select",
      required: true,
      options: promoCodeTypeOptions,
    },
    {
      key: "amountOff",
      label: "Amount off",
      type: "number",
      required: true,
      hint: "Percentage: a whole number, e.g. 25 for 25% off (Whop's own PromoCode entity later " +
        "reads this same value back as a decimal fraction, e.g. 0.25). Flat amount: in " +
        "baseCurrency's minor-agnostic units, e.g. 5 for $5 off.",
    },
    {
      key: "baseCurrency",
      label: "Base currency",
      type: "string",
      default: "usd",
      hint: "Three-letter ISO code. Required for a flat-amount discount.",
    },
    {
      key: "promoDurationMonths",
      label: "Duration (months)",
      type: "number",
      required: true,
      validation: { integer: true, min: 0 },
      hint: "How many renewals the discount applies to. 0 forever, 1 first payment only.",
    },
    {
      key: "newUsersOnly",
      label: "New users only",
      type: "boolean",
      required: true,
      default: true,
    },
    { key: "oneCustomer", label: "One redemption per customer", type: "boolean" },
    { key: "productId", label: "Product ID", type: "string", placeholder: "prod_xxxxxxxxxxxxxx" },
    { key: "expiresAt", label: "Expires at", type: "datetime" },
    { key: "stock", label: "Stock", type: "number", validation: { integer: true, min: 0 } },
    { key: "unlimitedStock", label: "Unlimited stock", type: "boolean" },
  ],
  output: [{ key: "data", type: "object", label: "The created promo code" }],

  execute(input, ctx) {
    return new WhopClient(ctx).post(
      "/promo_codes",
      {
        account_id: input.accountId,
        code: input.code,
        promo_type: input.promoType,
        amount_off: input.amountOff,
        base_currency: input.baseCurrency,
        promo_duration_months: input.promoDurationMonths,
        new_users_only: input.newUsersOnly,
        one_per_customer: input.oneCustomer,
        product_id: input.productId,
        expires_at: input.expiresAt,
        stock: input.stock,
        unlimited_stock: input.unlimitedStock,
      },
      idempotencyHeaders(ctx)["Idempotency-Key"],
    );
  },
};

export default promoCodeCreate;
