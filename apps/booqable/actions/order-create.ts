import type { ActionDefinition } from "@w6w/types";
import { BooqableClient, jsonApiBody } from "../lib/client.ts";

interface Input {
  startsAt: string;
  stopsAt: string;
  customerId?: string;
  fulfillmentType?: "pickup" | "delivery";
  depositType?: "none" | "percentage" | "percentage_total" | "fixed";
  depositValue?: number;
  taxRegionId?: string;
  couponId?: string;
}

/**
 * `POST /orders` — verified against developers.booqable.com ("Create an
 * order"). The created order starts empty (no line items). `starts_at`/
 * `stops_at` are the only fields every worked example sets, so they are
 * required here; every other field is optional per the docs' own body table.
 * Addresses (`delivery_address_property_id`, `billing_address_property_id`)
 * and inline `properties_attributes` are left out — both reference or create
 * account-specific address Properties, a shape this app cannot express
 * safely as a fixed Param. `confirm_shortage` is left to `order-update` and
 * `order-status-transition`, where a shortage can actually occur.
 */
const orderCreate: ActionDefinition<Input> = {
  key: "order-create",
  type: "perform",
  resource: "order",
  title: "Create Order",
  description: "Create an empty order for a date range. Starts in status `new`.",
  idempotent: false,
  params: [
    { key: "startsAt", label: "Starts at", type: "datetime", required: true },
    { key: "stopsAt", label: "Stops at", type: "datetime", required: true },
    { key: "customerId", label: "Customer ID", type: "string" },
    {
      key: "fulfillmentType",
      label: "Fulfillment type",
      type: "select",
      options: [
        { value: "pickup", label: "Pickup — customer collects from a location" },
        { value: "delivery", label: "Delivery — items are delivered to the customer" },
      ],
      advanced: true,
    },
    {
      key: "depositType",
      label: "Deposit type",
      type: "select",
      options: [
        { value: "none", label: "None" },
        { value: "percentage", label: "Percentage of item prices" },
        { value: "percentage_total", label: "Percentage of order total" },
        { value: "fixed", label: "Fixed amount" },
      ],
      advanced: true,
    },
    { key: "depositValue", label: "Deposit value", type: "number", advanced: true },
    { key: "taxRegionId", label: "Tax region ID", type: "string", advanced: true },
    { key: "couponId", label: "Coupon ID", type: "string", advanced: true },
  ],
  output: [{ key: "data", type: "object", label: "The created Order object" }],

  execute(input, ctx) {
    return new BooqableClient(ctx).request("/orders", {
      method: "POST",
      body: jsonApiBody("orders", {
        starts_at: input.startsAt,
        stops_at: input.stopsAt,
        customer_id: input.customerId,
        fulfillment_type: input.fulfillmentType,
        deposit_type: input.depositType,
        deposit_value: input.depositValue,
        tax_region_id: input.taxRegionId,
        coupon_id: input.couponId,
      }),
    });
  },
};

export default orderCreate;
