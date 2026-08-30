import type { Param } from "@w6w/types";

/**
 * Shared `Param` fragments for the Whop actions.
 *
 * Every field and enum here is transcribed from the per-endpoint OpenAPI 3.1
 * fragments `docs.whop.com` embeds in each reference page (fetched
 * 2026-08-29), not inferred from a sibling API.
 */

/**
 * Relay-style cursor pagination, shared by every native (`Api-Version-Date`
 * pinned) list endpoint. There is no offset form and no `total` count — only
 * `page_info.has_next_page`/`has_previous_page` say whether more exists.
 */
export function cursorParams(defaultFirst = 20): Param[] {
  return [
    {
      key: "first",
      label: "Limit",
      type: "number",
      default: defaultFirst,
      validation: { integer: true, min: 1, max: 100 },
      hint: "Number of results to return from the start of the window. Whop's ceiling is 100.",
    },
    {
      key: "after",
      label: "After cursor",
      type: "string",
      hint: "Paginate forwards from this cursor (page_info.end_cursor of a previous page).",
    },
    {
      key: "last",
      label: "Limit (from the end)",
      type: "number",
      validation: { integer: true, min: 1, max: 100 },
      hint: "Number of results to return from the end of the window, for paging backwards.",
    },
    {
      key: "before",
      label: "Before cursor",
      type: "string",
      hint: "Paginate backwards from this cursor (page_info.start_cursor of a previous page).",
    },
  ];
}

export interface CursorInput {
  first?: number;
  after?: string;
  last?: number;
  before?: string;
}

export function cursorQuery(input: CursorInput): Record<string, string | number | undefined> {
  return { first: input.first, after: input.after, last: input.last, before: input.before };
}

export const accountIdParam: Param = {
  key: "accountId",
  label: "Account ID",
  type: "string",
  placeholder: "biz_xxxxxxxxxxxxxx",
  hint: "Leave empty to use the connection's own account ID.",
};

export const accountIdRequiredParam: Param = {
  ...accountIdParam,
  required: true,
  hint: "The biz_... account to act on.",
};

export const membershipIdParam: Param = {
  key: "membershipId",
  label: "Membership",
  type: "string",
  required: true,
  placeholder: "mem_xxxxxxxxxxxxxx",
  hint: "Membership ID (mem_...), or the buyer's software license key.",
};

export const productIdParam: Param = {
  key: "productId",
  label: "Product",
  type: "string",
  required: true,
  placeholder: "prod_xxxxxxxxxxxxxx",
};

export const planIdParam: Param = {
  key: "planId",
  label: "Plan",
  type: "string",
  required: true,
  placeholder: "plan_xxxxxxxxxxxxxx",
};

export const promoCodeIdParam: Param = {
  key: "promoCodeId",
  label: "Promo Code",
  type: "string",
  required: true,
  placeholder: "promo_xxxxxxxxxxxxxx",
};

export const webhookIdParam: Param = {
  key: "webhookId",
  label: "Webhook",
  type: "string",
  required: true,
  placeholder: "hook_xxxxxxxxxxxxxx",
};

export const paymentIdParam: Param = {
  key: "paymentId",
  label: "Payment",
  type: "string",
  required: true,
  placeholder: "pay_xxxxxxxxxxxxxx",
};

/**
 * Three-letter ISO currency code. Whop's schemas enumerate ~90 supported
 * codes (including a few non-ISO ones — `whop_usd`, `btc`, `eth`, `usdt`); a
 * free-text field with a hint is more maintainable than mirroring the whole
 * enum, and the vendor validates it server-side regardless.
 */
export const currencyParam: Param = {
  key: "currency",
  label: "Currency",
  type: "string",
  placeholder: "usd",
  hint: "Three-letter ISO currency code (usd, eur, gbp, ...). Defaults to usd. See Whop's docs " +
    "for the full supported list, which also includes a few crypto codes (btc, eth, usdt).",
};

/** `order`/`direction` sort pair, present on every native list endpoint. */
export function sortParams(orderOptions: string[], defaultOrder: string): Param[] {
  return [
    {
      key: "order",
      label: "Sort by",
      type: "select",
      options: orderOptions.map((value) => ({ value, label: value })),
      default: defaultOrder,
    },
    {
      key: "direction",
      label: "Sort direction",
      type: "select",
      options: [
        { value: "desc", label: "Descending (default)" },
        { value: "asc", label: "Ascending" },
      ],
      default: "desc",
    },
  ];
}

export const createdWindowParams: Param[] = [
  {
    key: "createdAfter",
    label: "Created after",
    type: "datetime",
    hint: "ISO 8601 timestamp. Only return results created after this time.",
  },
  {
    key: "createdBefore",
    label: "Created before",
    type: "datetime",
    hint: "ISO 8601 timestamp. Only return results created before this time.",
  },
];

export interface CreatedWindowInput {
  createdAfter?: string;
  createdBefore?: string;
}

export function createdWindowQuery(
  input: CreatedWindowInput,
): Record<string, string | undefined> {
  return { created_after: input.createdAfter, created_before: input.createdBefore };
}

export const membershipStatusOptions = [
  { value: "trialing", label: "Trialing" },
  { value: "active", label: "Active" },
  { value: "past_due", label: "Past due" },
  { value: "completed", label: "Completed (one-time)" },
  { value: "canceled", label: "Canceled" },
  { value: "expired", label: "Expired" },
  { value: "canceling", label: "Canceling (active, set to cancel at period end)" },
  { value: "paused", label: "Paused (payment collection paused)" },
];

export const promoCodeStatusOptions = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
  { value: "archived", label: "Archived (deleted)" },
  { value: "expired", label: "Expired (inactive or archived)" },
];

export const promoCodeTypeOptions = [
  { value: "percentage", label: "Percentage off" },
  { value: "flat_amount", label: "Flat amount off" },
];

export const webhookEventOptions = [
  { value: "membership.activated", label: "Membership activated" },
  { value: "membership.deactivated", label: "Membership deactivated" },
  { value: "membership.trial_ending_soon", label: "Membership trial ending soon" },
  {
    value: "membership.cancel_at_period_end_changed",
    label: "Membership cancel-at-period-end changed",
  },
  { value: "member.created", label: "Member created" },
  { value: "payment.created", label: "Payment created" },
  { value: "payment.succeeded", label: "Payment succeeded" },
  { value: "payment.failed", label: "Payment failed" },
  { value: "payment.pending", label: "Payment pending" },
  { value: "payment.authorized", label: "Payment authorized" },
  { value: "payment.canceled", label: "Payment canceled" },
  { value: "refund.created", label: "Refund created" },
  { value: "refund.updated", label: "Refund updated" },
  { value: "dispute.created", label: "Dispute created" },
  { value: "dispute.updated", label: "Dispute updated" },
  { value: "dispute_alert.created", label: "Dispute alert created" },
  { value: "invoice.created", label: "Invoice created" },
  { value: "invoice.paid", label: "Invoice paid" },
  { value: "invoice.past_due", label: "Invoice past due" },
  { value: "invoice.voided", label: "Invoice voided" },
  { value: "invoice.marked_uncollectible", label: "Invoice marked uncollectible" },
  { value: "product.created", label: "Product created" },
  { value: "product.updated", label: "Product updated" },
  { value: "product.deleted", label: "Product deleted" },
  { value: "product.published", label: "Product published" },
  { value: "product.unpublished", label: "Product unpublished" },
  { value: "plan.created", label: "Plan created" },
  { value: "plan.updated", label: "Plan updated" },
  { value: "plan.deleted", label: "Plan deleted" },
  { value: "shipment.created", label: "Shipment created" },
  { value: "shipment.updated", label: "Shipment updated" },
  { value: "account.updated", label: "Account updated" },
  { value: "payout.created", label: "Payout created" },
  { value: "payout.updated", label: "Payout updated" },
  { value: "payout.reversed", label: "Payout reversed" },
  { value: "transfer.created", label: "Transfer created" },
  { value: "transfer.completed", label: "Transfer completed" },
  { value: "transfer.failed", label: "Transfer failed" },
];
