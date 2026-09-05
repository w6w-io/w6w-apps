import type { Param } from "@w6w/types";

/**
 * Shared `Param` fragments and option lists for the Lemon Squeezy actions.
 *
 * Every enum here is copied from the vendor's own reference pages (fetched
 * 2026-09-05 from `docs.lemonsqueezy.com/api/**`'s embedded MDX source), not
 * inferred.
 */

/** The `page[number]` / `page[size]` pair, identical on every list endpoint. */
export function paginationParams(): Param[] {
  return [
    {
      key: "pageNumber",
      label: "Page number",
      type: "number",
      validation: { integer: true, min: 1 },
      hint: "Which page to fetch. Defaults to 1.",
    },
    {
      key: "pageSize",
      label: "Page size",
      type: "number",
      validation: { integer: true, min: 1, max: 100 },
      hint: "Results per page. Defaults to 10, maximum 100.",
    },
  ];
}

/** Turn the two pagination params into `page[number]` / `page[size]` query keys. */
export function pageQuery(
  input: { pageNumber?: number; pageSize?: number },
): Record<string, string | number | undefined> {
  return {
    "page[number]": input.pageNumber,
    "page[size]": input.pageSize,
  };
}

/**
 * Fetch related resources in the same response (JSON:API `?include=`), e.g.
 * `variants` on a product or `store` on an order. Comma-separated for several.
 */
export const includeParam: Param = {
  key: "include",
  label: "Include related resources",
  type: "string",
  placeholder: "variants",
  hint: "Comma-separated relationship names to embed in the response's `included` array (e.g. " +
    "`store,variants`). See the object's `relationships` for valid names.",
  advanced: true,
};

/** Order lifecycle states — `the-order-object` attribute `status`. */
export const orderStatusOptions = [
  { value: "pending", label: "Pending" },
  { value: "failed", label: "Failed" },
  { value: "paid", label: "Paid" },
  { value: "refunded", label: "Refunded" },
  { value: "partial_refund", label: "Partially refunded" },
  { value: "fraudulent", label: "Fraudulent" },
];

/** Subscription lifecycle states — `the-subscription-object` attribute `status`. */
export const subscriptionStatusOptions = [
  { value: "on_trial", label: "On trial" },
  { value: "active", label: "Active" },
  { value: "paused", label: "Paused" },
  { value: "past_due", label: "Past due — a renewal payment failed" },
  { value: "unpaid", label: "Unpaid — payment recovery exhausted" },
  { value: "cancelled", label: "Cancelled — still valid until `ends_at`" },
  { value: "expired", label: "Expired" },
];

/** How a paused subscription's payments are handled — `pause.mode`. */
export const pauseModeOptions = [
  { value: "void", label: "Void — invoices are voided, customer isn't charged" },
  { value: "free", label: "Free — service continues, payment collection halts" },
];

/** Discount amount type — `the-discount-object` attribute `amount_type`. */
export const discountAmountTypeOptions = [
  { value: "percent", label: "Percent" },
  { value: "fixed", label: "Fixed amount (cents)" },
];

/** How often a discount re-applies to a subscription — attribute `duration`. */
export const discountDurationOptions = [
  { value: "once", label: "Once — the initial payment only" },
  { value: "repeating", label: "Repeating — a set number of months (`durationInMonths`)" },
  { value: "forever", label: "Forever — every payment" },
];

/** License key lifecycle states — `the-license-key-object` attribute `status`. */
export const licenseKeyStatusOptions = [
  { value: "inactive", label: "Inactive" },
  { value: "active", label: "Active" },
  { value: "expired", label: "Expired" },
  { value: "disabled", label: "Disabled" },
];

/** Variant status — `the-variant-object` attribute `status`. */
export const variantStatusOptions = [
  { value: "pending", label: "Pending — the product's only (default) variant" },
  { value: "draft", label: "Draft" },
  { value: "published", label: "Published" },
];

/**
 * Webhook event types Lemon Squeezy can deliver. Copied verbatim from the
 * `the-webhook-object` example payload plus the vendor's webhooks help page
 * linked from it; kept as free-text `multiselect` options rather than a
 * hand-maintained enum that could silently omit a newly-added event.
 */
export const webhookEventOptions = [
  { value: "order_created", label: "order_created" },
  { value: "order_refunded", label: "order_refunded" },
  { value: "subscription_created", label: "subscription_created" },
  { value: "subscription_updated", label: "subscription_updated" },
  { value: "subscription_cancelled", label: "subscription_cancelled" },
  { value: "subscription_resumed", label: "subscription_resumed" },
  { value: "subscription_expired", label: "subscription_expired" },
  { value: "subscription_paused", label: "subscription_paused" },
  { value: "subscription_unpaused", label: "subscription_unpaused" },
  { value: "subscription_payment_success", label: "subscription_payment_success" },
  { value: "subscription_payment_failed", label: "subscription_payment_failed" },
  { value: "subscription_payment_recovered", label: "subscription_payment_recovered" },
  { value: "subscription_plan_changed", label: "subscription_plan_changed" },
  { value: "license_key_created", label: "license_key_created" },
  { value: "license_key_updated", label: "license_key_updated" },
];

/** ISO 639 locales the Lemon Squeezy checkout UI supports — `checkout_options.locale`. */
export const checkoutLocaleOptions = [
  "bg",
  "hr",
  "cs",
  "da",
  "nl",
  "en",
  "et",
  "fil",
  "fi",
  "fr",
  "de",
  "el",
  "hu",
  "id",
  "it",
  "ja",
  "ko",
  "lv",
  "lt",
  "ms",
  "mt",
  "pl",
  "pt",
  "ro",
  "ru",
  "zh-CN",
  "sk",
  "sl",
  "es",
  "sv",
  "th",
  "tr",
  "vi",
].map((code) => ({ value: code, label: code }));
