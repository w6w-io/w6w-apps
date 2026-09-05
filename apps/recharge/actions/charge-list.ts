import type { ActionDefinition } from "@w6w/types";
import { compact, RechargeClient } from "../lib/client.ts";
import { paginationParams } from "../lib/params.ts";

interface Input {
  addressId?: string;
  customerId?: string;
  purchaseItemId?: string;
  externalOrderId?: string;
  status?: string;
  scheduledAtMin?: string;
  scheduledAtMax?: string;
  processedAtMin?: string;
  processedAtMax?: string;
  sortBy?: string;
  limit?: number;
  cursor?: string;
}

/**
 * `GET /charges` — list charges. Scope: `read_orders`.
 * Response envelope: `{"charges": [...], "next_cursor", "previous_cursor"}`.
 *
 * **90-day processed-charge window (added March 19th, 2025):** a *processed*
 * charge (`status` one of `success`, `refunded`, `partially_refunded`) whose
 * `processed_at` is more than 90 days in the past no longer appears in list
 * responses — the reference calls this out explicitly, since a
 * `processed_at_max` filter older than 90 days now returns an empty list
 * rather than an error. Charges in other statuses (`queued`, `error`, …) are
 * unaffected. Older processed charges remain available only via the
 * merchant portal's Exports tool, which this app does not reach.
 */
const chargeList: ActionDefinition<Input> = {
  key: "charge-list",
  type: "read",
  resource: "charge",
  title: "List Charges",
  description: "Return a list of charges. Processed charges older than 90 days are not " +
    "returned by Recharge; see the description for details.",
  params: [
    { key: "addressId", label: "Address ID", type: "string" },
    { key: "customerId", label: "Customer ID", type: "string" },
    { key: "purchaseItemId", label: "Subscription or onetime ID", type: "string" },
    { key: "externalOrderId", label: "External order ID", type: "string" },
    {
      key: "status",
      label: "Status",
      type: "select",
      options: [
        { value: "success", label: "Success" },
        { value: "queued", label: "Queued" },
        { value: "error", label: "Error" },
        { value: "refunded", label: "Refunded" },
        { value: "partially_refunded", label: "Partially refunded" },
        { value: "skipped", label: "Skipped" },
        { value: "pending_manual_payment", label: "Pending manual payment" },
        { value: "pending", label: "Pending" },
      ],
      hint: "Comma-separate multiple values, e.g. queued,error.",
    },
    { key: "scheduledAtMin", label: "Scheduled after", type: "datetime" },
    { key: "scheduledAtMax", label: "Scheduled before", type: "datetime" },
    {
      key: "processedAtMin",
      label: "Processed after",
      type: "datetime",
      hint: "Older than 90 days returns nothing for processed charges — see description.",
    },
    { key: "processedAtMax", label: "Processed before", type: "datetime" },
    {
      key: "sortBy",
      label: "Sort by",
      type: "select",
      options: [
        { value: "id-asc", label: "ID ascending" },
        { value: "id-desc", label: "ID descending" },
        { value: "updated_at-asc", label: "Updated ascending" },
        { value: "updated_at-desc", label: "Updated descending" },
        { value: "scheduled_at-asc", label: "Scheduled ascending" },
        { value: "scheduled_at-desc", label: "Scheduled descending" },
      ],
    },
    ...paginationParams(50),
  ],
  output: [
    { key: "items", type: "array", label: "Charges" },
    { key: "nextCursor", type: "string", label: "Cursor for the next page" },
    { key: "previousCursor", type: "string", label: "Cursor for the previous page" },
  ],

  async execute(input, ctx) {
    const client = new RechargeClient(ctx);
    const page = await client.list("/charges", "charges", {
      query: compact({
        address_id: input.addressId,
        customer_id: input.customerId,
        purchase_item_id: input.purchaseItemId,
        external_order_id: input.externalOrderId,
        status: input.status,
        scheduled_at_min: input.scheduledAtMin,
        scheduled_at_max: input.scheduledAtMax,
        processed_at_min: input.processedAtMin,
        processed_at_max: input.processedAtMax,
        sort_by: input.sortBy,
        limit: input.limit,
        cursor: input.cursor,
      }),
    });
    return { items: page.items, nextCursor: page.nextCursor, previousCursor: page.previousCursor };
  },
};

export default chargeList;
