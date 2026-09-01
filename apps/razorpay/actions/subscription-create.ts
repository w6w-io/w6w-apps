import type { ActionDefinition } from "@w6w/types";
import { compact, RazorpayClient } from "../lib/client.ts";
import { notesParam } from "../lib/params.ts";

/**
 * `POST /v1/subscriptions` — subscribe a customer to a plan.
 *
 * The response's `short_url` MUST be opened by the customer to authorize the
 * charge mandate (UPI Autopay, NACH, or card-on-file) — the subscription
 * will not charge anything until that authorization happens. Requires the
 * Subscriptions feature to be enabled on the account.
 */
interface Input {
  planId: string;
  totalCount: number;
  quantity?: number;
  customerNotify?: boolean;
  startAt?: number;
  expireBy?: number;
  offerId?: string;
  notifyPhone?: string;
  notifyEmail?: string;
  notes?: unknown;
}

const subscriptionCreate: ActionDefinition<Input> = {
  key: "subscription-create",
  type: "perform",
  resource: "subscription",
  title: "Create Subscription",
  description:
    "Subscribe a customer to a plan. The customer must open the returned short_url to authorize " +
    "the charge mandate before anything is billed.",
  idempotent: false,
  params: [
    {
      key: "planId",
      label: "Plan ID",
      type: "string",
      required: true,
      placeholder: "plan_00000000000001",
    },
    {
      key: "totalCount",
      label: "Total billing cycles",
      type: "number",
      required: true,
      validation: { integer: true, min: 0 },
      hint: "Use 0 for an indefinite subscription with no fixed end.",
    },
    {
      key: "quantity",
      label: "Quantity",
      type: "number",
      default: 1,
      validation: { integer: true, min: 1 },
    },
    {
      key: "customerNotify",
      label: "Let Razorpay notify the customer on each charge",
      type: "boolean",
    },
    {
      key: "startAt",
      label: "First charge at (Unix timestamp)",
      type: "number",
      validation: { integer: true },
      hint: "Defaults to subscription creation time.",
      advanced: true,
    },
    {
      key: "expireBy",
      label: "Mandate authorization deadline (Unix timestamp)",
      type: "number",
      validation: { integer: true },
      advanced: true,
    },
    { key: "offerId", label: "Offer / coupon ID", type: "string", advanced: true },
    {
      key: "notifyPhone",
      label: "Send mandate link to phone",
      type: "string",
      advanced: true,
      hint: "If set (with or without notifyEmail), Razorpay sends the mandate auth link directly.",
    },
    { key: "notifyEmail", label: "Send mandate link to email", type: "string", advanced: true },
    notesParam,
  ],
  output: [
    { key: "id", type: "string", label: "Subscription ID (sub_*)" },
    {
      key: "short_url",
      type: "string",
      label: "Mandate authorization URL — the customer must open it",
    },
    {
      key: "status",
      type: "string",
      label: "created | authenticated | active | pending | halted | …",
    },
  ],

  async execute(input, ctx) {
    const hasNotify = input.notifyPhone || input.notifyEmail;
    return await new RazorpayClient(ctx).post(
      "/subscriptions",
      compact({
        plan_id: input.planId,
        total_count: input.totalCount,
        quantity: input.quantity,
        customer_notify: input.customerNotify === undefined
          ? undefined
          : input.customerNotify
          ? 1
          : 0,
        start_at: input.startAt,
        expire_by: input.expireBy,
        offer_id: input.offerId,
        notify_info: hasNotify
          ? compact({ notify_phone: input.notifyPhone, notify_email: input.notifyEmail })
          : undefined,
        notes: input.notes,
      }),
    );
  },
};

export default subscriptionCreate;
