import type { ActionDefinition } from "@w6w/types";
import { BooqableClient, jsonApiBody } from "../lib/client.ts";

interface Input {
  orderId: string;
  transitionFrom: "new" | "draft" | "reserved" | "started" | "stopped" | "archived";
  transitionTo: "draft" | "reserved" | "started" | "stopped" | "archived" | "canceled";
  confirmShortage?: boolean;
  revert?: boolean;
}

/**
 * `POST /order_status_transitions` — verified against
 * developers.booqable.com ("Order status transitions"). This is how an order
 * actually moves through Booqable's lifecycle (`new` → `draft` → `reserved` →
 * `started` → `stopped`, or `archived`/`canceled`); `order-update` cannot do
 * this — the docs are explicit that `transition_to: "started"`/`"stopped"` is
 * only reachable directly in combination with `revert: true` (normal
 * start/stop happens through OrderFulfillment as items are picked up/
 * returned, out of scope here). A reserve that would cause a shortage answers
 * a 422 with `errors[0].code` of `items_not_available` (warning, retry with
 * `confirmShortage: true`) or `stock_item_specified` (blocking, cannot be
 * overridden) — both documented with worked examples.
 */
const orderStatusTransition: ActionDefinition<Input> = {
  key: "order-status-transition",
  type: "perform",
  resource: "order",
  title: "Transition Order Status",
  description:
    "Move an order between statuses (new, draft, reserved, started, stopped, archived, canceled).",
  // A transition targets a specific `transition_from` status; replaying it
  // once the order has already moved on fails rather than silently
  // no-opping, so this is not safe to retry blindly.
  idempotent: false,
  params: [
    { key: "orderId", label: "Order ID", type: "string", required: true },
    {
      key: "transitionFrom",
      label: "From status",
      type: "select",
      required: true,
      options: [
        { value: "new", label: "New" },
        { value: "draft", label: "Draft" },
        { value: "reserved", label: "Reserved" },
        { value: "started", label: "Started" },
        { value: "stopped", label: "Stopped" },
        { value: "archived", label: "Archived" },
      ],
    },
    {
      key: "transitionTo",
      label: "To status",
      type: "select",
      required: true,
      options: [
        { value: "draft", label: "Draft" },
        { value: "reserved", label: "Reserved" },
        { value: "started", label: "Started (requires revert)" },
        { value: "stopped", label: "Stopped (requires revert)" },
        { value: "archived", label: "Archived" },
        { value: "canceled", label: "Canceled" },
      ],
    },
    {
      key: "confirmShortage",
      label: "Confirm shortage",
      type: "boolean",
      hint: "Proceed despite a shortage warning (not a blocking conflict) reserving would raise.",
      advanced: true,
    },
    {
      key: "revert",
      label: "Revert",
      type: "boolean",
      hint: "Required to transition directly to `started` or `stopped` outside normal fulfillment.",
      advanced: true,
    },
  ],
  output: [{ key: "data", type: "object", label: "The OrderStatusTransition object" }],

  execute(input, ctx) {
    return new BooqableClient(ctx).request("/order_status_transitions", {
      method: "POST",
      body: jsonApiBody("order_status_transitions", {
        order_id: input.orderId,
        transition_from: input.transitionFrom,
        transition_to: input.transitionTo,
        confirm_shortage: input.confirmShortage ?? null,
        revert: input.revert ?? null,
      }),
    });
  },
};

export default orderStatusTransition;
