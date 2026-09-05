import type { ActionDefinition } from "@w6w/types";
import {
  asOptionalJson,
  compact,
  jsonApiBody,
  LemonSqueezyClient,
  relationshipRef,
} from "../lib/client.ts";
import { checkoutLocaleOptions } from "../lib/params.ts";

/**
 * `POST /v1/checkouts` — `store` and `variant` are required relationships.
 *
 * `product_options`, `checkout_options` and `checkout_data` are large
 * free-form objects (20+ documented sub-fields between them, mostly colors
 * and copy overrides) — the common ones are real params here; the `*Json`
 * params are an escape hatch for anything else the vendor documents, merged
 * UNDER the named params so a structured field always wins over a raw one.
 */
interface Input {
  storeId: string;
  variantId: string;
  customPrice?: number;
  redirectUrl?: string;
  prefillEmail?: string;
  prefillName?: string;
  discountCode?: string;
  customData?: unknown;
  embed?: boolean;
  locale?: string;
  preview?: boolean;
  testMode?: boolean;
  expiresAt?: string;
  productOptionsJson?: unknown;
  checkoutOptionsJson?: unknown;
  checkoutDataJson?: unknown;
}

const checkoutCreate: ActionDefinition<Input> = {
  key: "checkout-create",
  type: "perform",
  resource: "checkout",
  title: "Create Checkout",
  description: "Create a custom checkout URL for a variant, with optional prefill, discount " +
    "and price overrides.",
  idempotent: false,
  params: [
    { key: "storeId", label: "Store ID", type: "string", required: true },
    { key: "variantId", label: "Variant ID", type: "string", required: true },
    {
      key: "customPrice",
      label: "Custom price (cents)",
      type: "number",
      validation: { integer: true, min: 0 },
      hint: "Overrides the variant's price. Used for every renewal if the variant is a " +
        "subscription.",
    },
    { key: "redirectUrl", label: "Redirect URL after purchase", type: "string" },
    { key: "prefillEmail", label: "Prefill email", type: "string" },
    { key: "prefillName", label: "Prefill name", type: "string" },
    { key: "discountCode", label: "Prefill discount code", type: "string" },
    {
      key: "customData",
      label: "Custom data",
      type: "json",
      hint: "Passed through to order/subscription webhooks as `meta.custom_data`.",
    },
    {
      key: "embed",
      label: "Embed as overlay",
      type: "boolean",
      hint: "Show the checkout overlay instead of a full page.",
    },
    { key: "locale", label: "Locale", type: "select", options: checkoutLocaleOptions },
    {
      key: "preview",
      label: "Return a price preview",
      type: "boolean",
      hint: "Include a `preview` object with tax/discount/total pricing in the response.",
    },
    { key: "testMode", label: "Test mode only", type: "boolean" },
    { key: "expiresAt", label: "Expires at", type: "datetime", hint: "Leave blank for perpetual." },
    {
      key: "productOptionsJson",
      label: "Product options (raw JSON)",
      type: "json",
      advanced: true,
      hint: "Any of Lemon Squeezy's `product_options` fields not covered above (name, " +
        "description, media, receipt_*, enabled_variants).",
    },
    {
      key: "checkoutOptionsJson",
      label: "Checkout options (raw JSON)",
      type: "json",
      advanced: true,
      hint: "Any of Lemon Squeezy's `checkout_options` fields not covered above (colors, " +
        "media/logo/desc/discount visibility, skip_trial, subscription_preview).",
    },
    {
      key: "checkoutDataJson",
      label: "Checkout data (raw JSON)",
      type: "json",
      advanced: true,
      hint: "Any of Lemon Squeezy's `checkout_data` fields not covered above (billing_address, " +
        "tax_number, variant_quantities).",
    },
  ],
  output: [{ key: "data", type: "object", label: "The created Checkout object, incl. its URL" }],

  execute(input, ctx) {
    const productOptions = {
      ...(asOptionalJson<Record<string, unknown>>(input.productOptionsJson, "Product options") ??
        {}),
      ...compact({ redirect_url: input.redirectUrl }),
    };
    const checkoutOptions = {
      ...(asOptionalJson<Record<string, unknown>>(input.checkoutOptionsJson, "Checkout options") ??
        {}),
      ...compact({ embed: input.embed, locale: input.locale }),
    };
    const checkoutData = {
      ...(asOptionalJson<Record<string, unknown>>(input.checkoutDataJson, "Checkout data") ?? {}),
      ...compact({
        email: input.prefillEmail,
        name: input.prefillName,
        discount_code: input.discountCode,
        custom: asOptionalJson(input.customData, "Custom data"),
      }),
    };

    return new LemonSqueezyClient(ctx).request("/checkouts", {
      method: "POST",
      body: jsonApiBody(
        "checkouts",
        {
          custom_price: input.customPrice,
          product_options: Object.keys(productOptions).length ? productOptions : undefined,
          checkout_options: Object.keys(checkoutOptions).length ? checkoutOptions : undefined,
          checkout_data: Object.keys(checkoutData).length ? checkoutData : undefined,
          preview: input.preview,
          test_mode: input.testMode,
          expires_at: input.expiresAt,
        },
        {
          store: relationshipRef("stores", input.storeId),
          variant: relationshipRef("variants", input.variantId),
        },
      ),
    });
  },
};

export default checkoutCreate;
