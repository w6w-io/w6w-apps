import type { Param } from "@w6w/types";

/**
 * Shared `Param` fragments and option lists for the Paddle actions.
 *
 * Every enum here is copied from the vendor's own reference pages (fetched
 * 2026-08-10 from `developer.paddle.com/api-reference/**.md`), not inferred.
 * Where Paddle documents a different default or maximum per endpoint — the
 * `per_page` ceiling is 200 for most lists, 30 for transactions and 50 for
 * adjustments — the value is stated at the call site rather than averaged into
 * one wrong number here.
 */

/** `active` / `archived`, Paddle's universal entity status. */
export const entityStatusOptions = [
  { value: "active", label: "Active — usable and returned when listing" },
  { value: "archived", label: "Archived — not usable for billing" },
];

/** Catalog vs non-catalog items. Applies to both products and prices. */
export const itemTypeOptions = [
  { value: "standard", label: "Standard — part of your catalog" },
  { value: "custom", label: "Custom — one-off, not shown in the dashboard" },
];

/**
 * Paddle's tax categories. Each must be enabled on the account before it can be
 * used; a disabled one is rejected at create time.
 */
export const taxCategoryOptions = [
  { value: "standard", label: "Standard — pre-written downloadable software" },
  { value: "saas", label: "SaaS — cloud-based applications" },
  { value: "digital-goods", label: "Digital goods — non-software files or media" },
  { value: "ebooks", label: "Ebooks — digital books and educational material" },
  { value: "implementation-services", label: "Implementation services" },
  { value: "professional-services", label: "Professional services" },
  { value: "software-programming-services", label: "Software programming services" },
  { value: "training-services", label: "Training services" },
  { value: "website-hosting", label: "Website hosting" },
];

/** Subscription lifecycle states, as returned and as filterable. */
export const subscriptionStatusOptions = [
  { value: "active", label: "Active — Paddle is billing for it" },
  { value: "trialing", label: "Trialing — in a trial period" },
  { value: "past_due", label: "Past due — a payment failed" },
  { value: "paused", label: "Paused" },
  { value: "canceled", label: "Canceled" },
];

/** When a subscription change takes effect. */
export const effectiveFromOptions = [
  {
    value: "next_billing_period",
    label: "Next billing period — schedules the change for the end of the period",
  },
  { value: "immediately", label: "Immediately" },
];

/** How Paddle sets the billing period when a paused subscription resumes. */
export const onResumeOptions = [
  {
    value: "start_new_billing_period",
    label: "Start a new billing period — charges the full amount immediately",
  },
  {
    value: "continue_existing_billing_period",
    label: "Continue the existing billing period — no immediate charge if resumed before it ends",
  },
];

/** Transaction lifecycle states. */
export const transactionStatusOptions = [
  { value: "draft", label: "Draft" },
  { value: "ready", label: "Ready" },
  { value: "billed", label: "Billed — invoice issued, awaiting payment" },
  { value: "paid", label: "Paid" },
  { value: "completed", label: "Completed" },
  { value: "canceled", label: "Canceled" },
  { value: "past_due", label: "Past due" },
];

/** How payment is collected. */
export const collectionModeOptions = [
  { value: "automatic", label: "Automatic — checkout or saved payment method" },
  { value: "manual", label: "Manual — invoice with payment terms" },
];

/**
 * Adjustment actions. Only `credit` and `refund` are creatable by an API
 * caller; the rest are created by Paddle itself when a chargeback happens, and
 * are listed here because they are valid *filters* on the list endpoint.
 */
export const adjustmentActionFilterOptions = [
  { value: "refund", label: "Refund — money returned to the original payment method" },
  { value: "credit", label: "Credit — reduces what is owed on a manually-collected transaction" },
  { value: "chargeback", label: "Chargeback (created by Paddle)" },
  { value: "chargeback_reverse", label: "Chargeback reversal (created by Paddle)" },
  { value: "chargeback_warning", label: "Chargeback warning (created by Paddle)" },
  { value: "chargeback_warning_reverse", label: "Chargeback warning reversal (created by Paddle)" },
  { value: "credit_reverse", label: "Credit reversal (created by Paddle)" },
];

/**
 * The cursor pagination pair, identical on every list endpoint.
 *
 * `after` is the Paddle ID of the last entity on the previous page, which is
 * what `meta.pagination.next` encodes. It is exposed as a plain param — rather
 * than hidden behind an auto-paging loop — because a workflow step that returns
 * one page and its cursor is composable, and one that silently fetches 100,000
 * entities is a way to hit the 240 requests/minute limit by accident.
 */
export function paginationParams(perPageHint: string): Param[] {
  return [
    {
      key: "perPage",
      label: "Per page",
      type: "number",
      validation: { integer: true, min: 1 },
      hint: perPageHint,
    },
    {
      key: "after",
      label: "After (cursor)",
      type: "string",
      hint:
        "Paddle ID of the last entity on the previous page. Take it from `meta.pagination.next` " +
        "in a previous response; results start *after* it, not including it.",
    },
  ];
}

/** `id[ASC]` / `id[DESC]`-style ordering, spelled out because the syntax is unusual. */
export function orderByParam(validFields: string): Param {
  return {
    key: "orderBy",
    label: "Order by",
    type: "string",
    placeholder: "id[DESC]",
    hint: `Field and direction, e.g. \`id[ASC]\`. Valid fields: ${validFields}.`,
  };
}

/** The `id=a,b,c` filter every list endpoint accepts. */
export const idsParam: Param = {
  key: "ids",
  label: "IDs",
  type: "string",
  hint: "Return only these Paddle IDs. Comma-separated for several.",
};

/** Paddle's free-form key-value bag, present on most entities. */
export const customDataParam: Param = {
  key: "customData",
  label: "Custom data",
  type: "json",
  hint: "Your own structured key-value data, stored against the entity.",
};
