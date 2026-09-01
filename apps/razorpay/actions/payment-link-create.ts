import type { ActionDefinition } from "@w6w/types";
import { compact, RazorpayClient } from "../lib/client.ts";
import { amountParam, currencyParam, notesParam } from "../lib/params.ts";

/**
 * `POST /v1/payment_links` — a shareable link to collect payment via SMS
 * and email, across all supported methods or UPI-only.
 *
 * UPI-only links (`upiLink: true`) are **not available in test mode**, and
 * partial payments are not supported for them. Links expire after 6 months
 * by default.
 */
interface Input {
  amount: number;
  currency?: string;
  upiLink?: boolean;
  acceptPartial?: boolean;
  firstMinPartialAmount?: number;
  expireBy?: number;
  referenceId?: string;
  description?: string;
  customerName?: string;
  customerEmail?: string;
  customerContact?: string;
  notifySms?: boolean;
  notifyEmail?: boolean;
  reminderEnable?: boolean;
  callbackUrl?: string;
  notes?: unknown;
}

const paymentLinkCreate: ActionDefinition<Input> = {
  key: "payment-link-create",
  type: "perform",
  resource: "payment-link",
  title: "Create Payment Link",
  description:
    "Create a shareable payment link. UPI-only links are not available in test mode and do not " +
    "support partial payments.",
  idempotent: false,
  params: [
    amountParam("Amount"),
    currencyParam,
    {
      key: "upiLink",
      label: "UPI-only link",
      type: "boolean",
      default: false,
      hint: "Not available in test mode. Does not support partial payments. INR only.",
    },
    { key: "acceptPartial", label: "Accept partial payments", type: "boolean" },
    {
      key: "firstMinPartialAmount",
      label: "Minimum first partial amount",
      type: "number",
      validation: { integer: true, min: 1 },
      advanced: true,
    },
    {
      key: "expireBy",
      label: "Expires at (Unix timestamp)",
      type: "number",
      validation: { integer: true },
      hint: "At most 6 months from creation, and at least 15 minutes in the future.",
      advanced: true,
    },
    {
      key: "referenceId",
      label: "Reference ID",
      type: "string",
      hint: "Your unique tracking reference. Max 40 characters. Must be unique.",
    },
    { key: "description", label: "Description", type: "text", hint: "Max 2048 characters." },
    {
      key: "customerName",
      label: "Customer name",
      type: "string",
      advanced: true,
      hint: "Not auto-populated on checkout — the customer still enters details manually.",
    },
    { key: "customerEmail", label: "Customer email", type: "string", advanced: true },
    { key: "customerContact", label: "Customer phone", type: "string", advanced: true },
    { key: "notifySms", label: "Notify by SMS", type: "boolean", advanced: true },
    { key: "notifyEmail", label: "Notify by email", type: "boolean", advanced: true },
    { key: "reminderEnable", label: "Send automatic payment reminders", type: "boolean" },
    { key: "callbackUrl", label: "Callback URL", type: "string", advanced: true },
    notesParam,
  ],
  output: [
    { key: "id", type: "string", label: "Payment Link ID (plink_*)" },
    { key: "short_url", type: "string", label: "Shareable URL" },
    { key: "amount", type: "number", label: "Amount (sub-unit)" },
    {
      key: "status",
      type: "string",
      label: "created | partially_paid | expired | cancelled | paid",
    },
  ],

  async execute(input, ctx) {
    const hasCustomer = input.customerName || input.customerEmail || input.customerContact;
    return await new RazorpayClient(ctx).post(
      "/payment_links",
      compact({
        amount: input.amount,
        currency: input.currency,
        upi_link: input.upiLink,
        accept_partial: input.acceptPartial,
        first_min_partial_amount: input.firstMinPartialAmount,
        expire_by: input.expireBy,
        reference_id: input.referenceId,
        description: input.description,
        customer: hasCustomer
          ? compact({
            name: input.customerName,
            email: input.customerEmail,
            contact: input.customerContact,
          })
          : undefined,
        notify: (input.notifySms !== undefined || input.notifyEmail !== undefined)
          ? compact({ sms: input.notifySms, email: input.notifyEmail })
          : undefined,
        reminder_enable: input.reminderEnable,
        callback_url: input.callbackUrl,
        callback_method: input.callbackUrl ? "get" : undefined,
        notes: input.notes,
      }),
    );
  },
};

export default paymentLinkCreate;
