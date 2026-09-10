import type { ActionDefinition } from "@w6w/types";
import { metadata, StripeClient, unset } from "../lib/client.ts";
import { amount, currency, metadataParam } from "../lib/params.ts";

interface Input {
  amount: number;
  currency: string;
  customerId?: string;
  paymentMethod?: string;
  description?: string;
  receiptEmail?: string;
  captureMethod?: string;
  confirm?: boolean;
  setupFutureUsage?: string;
  statementDescriptor?: string;
  metadata?: unknown;
}

/**
 * PaymentIntents are Stripe's current payments primitive — they handle SCA /
 * 3-D Secure, which the older Charges API cannot. Prefer this over creating a
 * charge directly.
 */
const paymentIntentCreate: ActionDefinition<Input> = {
  key: "payment-intent-create",
  type: "perform",
  resource: "paymentIntent",
  title: "Create Payment Intent",
  description: "Start a payment. Handles SCA / 3-D Secure, unlike the legacy Charges API.",
  // The invocation id is sent as Stripe's Idempotency-Key, so a retry replays
  // the original intent rather than charging the customer twice.
  idempotent: true,
  params: [
    amount("Amount"),
    currency,
    { key: "customerId", label: "Customer ID", type: "string", placeholder: "cus_…" },
    {
      key: "paymentMethod",
      label: "Payment method",
      type: "string",
      placeholder: "pm_…",
      hint: "Required when confirming immediately.",
    },
    { key: "description", label: "Description", type: "string" },
    { key: "receiptEmail", label: "Receipt email", type: "string" },
    {
      key: "captureMethod",
      label: "Capture",
      type: "select",
      default: "automatic",
      options: [
        { value: "automatic", label: "Automatic — capture on confirmation" },
        { value: "manual", label: "Manual — authorise now, capture later" },
      ],
    },
    {
      key: "confirm",
      label: "Confirm immediately",
      type: "boolean",
      hint: "Attempt the payment right away. Needs a payment method.",
    },
    {
      key: "setupFutureUsage",
      label: "Setup future usage",
      type: "select",
      options: [
        { value: "on_session", label: "On session" },
        { value: "off_session", label: "Off session" },
      ],
      hint: "Save the payment method for a future payment.",
    },
    {
      key: "statementDescriptor",
      label: "Statement descriptor",
      type: "string",
      hint: "Up to 22 characters, shown on the customer's statement.",
    },
    metadataParam,
  ],
  output: [
    { key: "id", type: "string", label: "PaymentIntent ID" },
    { key: "status", type: "string", label: "Status" },
    { key: "amount", type: "number", label: "Amount" },
    { key: "client_secret", type: "string", label: "Client secret" },
    { key: "next_action", type: "object", label: "Next action (e.g. 3-D Secure)" },
  ],

  execute(input, ctx) {
    return new StripeClient(ctx).request("/payment_intents", {
      form: {
        amount: input.amount,
        currency: input.currency,
        customer: unset(input.customerId),
        payment_method: unset(input.paymentMethod),
        description: unset(input.description),
        receipt_email: unset(input.receiptEmail),
        capture_method: unset(input.captureMethod),
        confirm: input.confirm,
        setup_future_usage: unset(input.setupFutureUsage),
        statement_descriptor: unset(input.statementDescriptor),
        metadata: metadata(input.metadata),
      },
    });
  },
};

export default paymentIntentCreate;
