import type { Param } from "@w6w/types";

/**
 * Shared `Param` fragments for the Recharge actions.
 *
 * Every option list here is copied verbatim from Recharge's own API reference
 * (`developer.getrecharge.com`, `2021-11`), not inferred.
 */

/**
 * The cursor-pagination pair every list endpoint documents.
 *
 * Recharge's `page`-based pagination is documented `*Deprecated` on every list
 * endpoint checked (still capped at page 100 when used), and "Starting with
 * the 2021-11 version of the API, you will not be able to retrieve a count of
 * total records for a given GET request" — cursor pagination is what the
 * `next_cursor` / `previous_cursor` fields on every list response exist for,
 * so this app only ever exposes that form.
 */
export function paginationParams(defaultLimit = 50): Param[] {
  return [
    {
      key: "limit",
      label: "Limit",
      type: "number",
      default: defaultLimit,
      validation: { integer: true, min: 1, max: 250 },
      hint: "Number of results. Recharge's default is 50, maximum 250.",
    },
    {
      key: "cursor",
      label: "Cursor",
      type: "string",
      hint: "Pass a `next_cursor` or `previous_cursor` value from a prior list call to page.",
    },
  ];
}

/** `created_at` / `updated_at` min-max filter pair, documented on most list endpoints. */
export function timestampFilterParams(label: string): Param[] {
  return [
    {
      key: "createdAtMin",
      label: `${label} created after`,
      type: "datetime",
    },
    {
      key: "createdAtMax",
      label: `${label} created before`,
      type: "datetime",
    },
    {
      key: "updatedAtMin",
      label: `${label} updated after`,
      type: "datetime",
    },
    {
      key: "updatedAtMax",
      label: `${label} updated before`,
      type: "datetime",
    },
  ];
}

export function timestampFilterQuery(input: {
  createdAtMin?: string;
  createdAtMax?: string;
  updatedAtMin?: string;
  updatedAtMax?: string;
}): Record<string, string | undefined> {
  return {
    created_at_min: input.createdAtMin,
    created_at_max: input.createdAtMax,
    updated_at_min: input.updatedAtMin,
    updated_at_max: input.updatedAtMax,
  };
}

/**
 * `POST /webhooks` `topic` — the full vendor-documented event catalogue
 * ("Available webhooks" section), object-qualified since several event names
 * are unique but the section groups them by the resource they describe.
 */
export const webhookTopicOptions = [
  { value: "address/created", label: "Address created" },
  { value: "address/updated", label: "Address updated" },
  { value: "async_batch/processed", label: "Async batch processed" },
  { value: "bundle_selection/created", label: "Bundle selection created" },
  { value: "bundle_selection/updated", label: "Bundle selection updated" },
  { value: "bundle_selection/deleted", label: "Bundle selection deleted" },
  { value: "customer/activated", label: "Customer activated" },
  { value: "customer/created", label: "Customer created" },
  { value: "customer/deactivated", label: "Customer deactivated" },
  { value: "customer/payment_method_updated", label: "Customer payment method updated" },
  { value: "customer/updated", label: "Customer updated" },
  { value: "customer/deleted", label: "Customer deleted" },
  { value: "charge/created", label: "Charge created" },
  { value: "charge/failed", label: "Charge failed" },
  { value: "charge/max_retries_reached", label: "Charge max retries reached" },
  { value: "charge/paid", label: "Charge paid" },
  { value: "charge/refunded", label: "Charge refunded" },
  { value: "charge/uncaptured", label: "Charge uncaptured" },
  { value: "charge/upcoming", label: "Charge upcoming" },
  { value: "charge/updated", label: "Charge updated" },
  { value: "charge/deleted", label: "Charge deleted" },
  { value: "checkout/created", label: "Checkout created" },
  { value: "checkout/completed", label: "Checkout completed" },
  { value: "checkout/processed", label: "Checkout processed" },
  { value: "checkout/updated", label: "Checkout updated" },
  { value: "gift_purchase/created", label: "Gift purchase created" },
  { value: "gift_purchase/redeemed", label: "Gift purchase redeemed" },
  { value: "onetime/created", label: "Onetime created" },
  { value: "onetime/deleted", label: "Onetime deleted" },
  { value: "onetime/updated", label: "Onetime updated" },
  { value: "order/cancelled", label: "Order cancelled" },
  { value: "order/created", label: "Order created" },
  { value: "order/deleted", label: "Order deleted" },
  { value: "order/processed", label: "Order processed" },
  { value: "order/payment_captured", label: "Order payment captured" },
  { value: "order/upcoming", label: "Order upcoming" },
  { value: "order/updated", label: "Order updated" },
  { value: "order/success", label: "Order success" },
  { value: "plan/created", label: "Plan created" },
  { value: "plan/deleted", label: "Plan deleted" },
  { value: "plan/updated", label: "Plan updated" },
  { value: "subscription/activated", label: "Subscription activated" },
  { value: "subscription/cancelled", label: "Subscription cancelled" },
  { value: "subscription/created", label: "Subscription created" },
  { value: "subscription/deleted", label: "Subscription deleted" },
  { value: "subscription/skipped", label: "Subscription skipped" },
  {
    value: "subscription/removed_from_skipped_charge",
    label: "Subscription removed from skipped charge",
  },
  { value: "subscription/updated", label: "Subscription updated" },
  { value: "subscription/unskipped", label: "Subscription unskipped" },
  { value: "subscription/swapped", label: "Subscription swapped" },
  { value: "subscription/paused", label: "Subscription paused" },
  { value: "store/updated", label: "Store updated" },
  { value: "recharge/uninstalled", label: "Recharge app uninstalled" },
];

export const customerIdParam: Param = {
  key: "customerId",
  label: "Customer ID",
  type: "string",
  required: true,
  hint: "The Recharge `customer_id` (the numeric `id` field of a Customer, not the store's own " +
    "external customer id).",
};

export const addressIdParam: Param = {
  key: "addressId",
  label: "Address ID",
  type: "string",
  required: true,
  hint: "The Recharge `address_id`.",
};

export const subscriptionIdParam: Param = {
  key: "subscriptionId",
  label: "Subscription ID",
  type: "string",
  required: true,
  hint: "The Recharge `subscription_id`.",
};

export const chargeIdParam: Param = {
  key: "chargeId",
  label: "Charge ID",
  type: "string",
  required: true,
  hint: "The Recharge `charge_id`.",
};
