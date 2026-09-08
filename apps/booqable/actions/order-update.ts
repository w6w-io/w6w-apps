import type { ActionDefinition } from "@w6w/types";
import { BooqableClient, jsonApiBody } from "../lib/client.ts";

interface Input {
  orderId: string;
  startsAt?: string;
  stopsAt?: string;
  customerId?: string;
  fulfillmentType?: "pickup" | "delivery";
  depositType?: "none" | "percentage" | "percentage_total" | "fixed";
  depositValue?: number;
  taxRegionId?: string;
  couponId?: string;
  confirmShortage?: boolean;
}

/**
 * `PUT /orders/{id}` — verified against developers.booqable.com ("Update an
 * order"). Changing `starts_at`/`stops_at`/quantities can trigger a shortage
 * warning (a 422 with `errors[0].meta.warning`/`.blocking`); set
 * `confirmShortage` to override a *warning* (a *blocking* shortage cannot be
 * overridden this way — see the docs' Shortage Handling section).
 */
const orderUpdate: ActionDefinition<Input> = {
  key: "order-update",
  type: "perform",
  resource: "order",
  title: "Update Order",
  description: "Update fields on an existing order. Only fields you set are changed.",
  idempotent: true,
  params: [
    { key: "orderId", label: "Order ID", type: "string", required: true },
    { key: "startsAt", label: "Starts at", type: "datetime" },
    { key: "stopsAt", label: "Stops at", type: "datetime" },
    { key: "customerId", label: "Customer ID", type: "string" },
    {
      key: "fulfillmentType",
      label: "Fulfillment type",
      type: "select",
      options: [
        { value: "pickup", label: "Pickup" },
        { value: "delivery", label: "Delivery" },
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
    {
      key: "confirmShortage",
      label: "Confirm shortage",
      type: "boolean",
      hint: "Proceed despite a shortage warning this update would otherwise raise as an error.",
      advanced: true,
    },
  ],
  output: [{ key: "data", type: "object", label: "The updated Order object" }],

  execute(input, ctx) {
    return new BooqableClient(ctx).request(`/orders/${input.orderId}`, {
      method: "PUT",
      body: jsonApiBody("orders", {
        starts_at: input.startsAt,
        stops_at: input.stopsAt,
        customer_id: input.customerId,
        fulfillment_type: input.fulfillmentType,
        deposit_type: input.depositType,
        deposit_value: input.depositValue,
        tax_region_id: input.taxRegionId,
        coupon_id: input.couponId,
        confirm_shortage: input.confirmShortage,
      }, input.orderId),
    });
  },
};

export default orderUpdate;
