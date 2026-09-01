import type { ActionDefinition } from "@w6w/types";
import { RazorpayClient } from "../lib/client.ts";
import { amountParam, currencyParam, notesParam } from "../lib/params.ts";

/**
 * `POST /v1/orders` — create an order before initiating a payment.
 *
 * An order can have multiple payment attempts but only one successful
 * capture. The returned `id` is what a client-side Razorpay Checkout
 * integration needs to open the payment sheet.
 */
interface Input {
  amount: number;
  currency?: string;
  receipt?: string;
  partialPayment?: boolean;
  notes?: unknown;
}

const orderCreate: ActionDefinition<Input> = {
  key: "order-create",
  type: "perform",
  resource: "order",
  title: "Create Order",
  description: "Create an order before initiating a payment.",
  idempotent: false,
  params: [
    amountParam("Amount"),
    currencyParam,
    {
      key: "receipt",
      label: "Receipt",
      type: "string",
      hint: "Your internal receipt number. Max 40 characters.",
    },
    {
      key: "partialPayment",
      label: "Allow partial payments",
      type: "boolean",
      default: false,
    },
    notesParam,
  ],
  output: [
    { key: "id", type: "string", label: "Order ID (order_*)" },
    { key: "amount", type: "number", label: "Amount (sub-unit)" },
    { key: "amount_paid", type: "number", label: "Amount paid so far" },
    { key: "amount_due", type: "number", label: "Amount still due" },
    { key: "currency", type: "string", label: "Currency" },
    { key: "receipt", type: "string", label: "Receipt" },
    { key: "status", type: "string", label: "created | attempted | paid" },
    { key: "created_at", type: "number", label: "Created (Unix timestamp)" },
  ],

  async execute(input, ctx) {
    return await new RazorpayClient(ctx).post("/orders", {
      amount: input.amount,
      currency: input.currency,
      receipt: input.receipt,
      partial_payment: input.partialPayment,
      notes: input.notes,
    });
  },
};

export default orderCreate;
