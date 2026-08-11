import type { ActionDefinition } from "@w6w/types";
import { asOptionalJson, compact, PaddleClient } from "../lib/client.ts";

/**
 * `POST /adjustments` — refund or credit a transaction.
 *
 * This is the action in the app that moves real money, and it has four sharp
 * edges, all of them Paddle's:
 *
 * **1. A refund is usually not immediate.** On live accounts most refunds are
 * created with the status `pending_approval` and wait for a Paddle reviewer.
 * A `201` here means "requested", not "refunded". (Sandbox auto-approves every
 * ten minutes.)
 *
 * **2. Refund and credit are not interchangeable.** `refund` returns money to
 * the original payment method and only works on `completed` transactions.
 * `credit` reduces what is still owed and only works on manually-collected
 * transactions that are `billed` or `past_due`. Using the wrong one is a 400,
 * not a silent conversion.
 *
 * **3. `partial` is the default, and it needs items.** Omit `type` and Paddle
 * treats the request as partial, which requires an `items` array of
 * `txnitm_…` ids from the transaction's `details.line_items`. To refund
 * everything, pass `type: "full"` and no items.
 *
 * **4. It is not idempotent and there is no idempotency key.** Running it twice
 * creates two refunds. `idempotent: false` is honest here, and the invocation
 * id is deliberately *not* smuggled into `reason` — the field is customer-facing
 * record-keeping text shown in the Paddle dashboard, not a dedupe slot.
 */
interface Input {
  transactionId: string;
  action: string;
  reason: string;
  type?: string;
  items?: unknown;
  taxMode?: string;
}

const adjustmentCreate: ActionDefinition<Input> = {
  key: "adjustment-create",
  type: "perform",
  resource: "adjustment",
  title: "Create Adjustment (Refund or Credit)",
  description:
    "Refund or credit all or part of a transaction. Live refunds are usually created as " +
    "`pending_approval` and reviewed by Paddle before any money moves.",
  idempotent: false,
  params: [
    {
      key: "transactionId",
      label: "Transaction ID",
      type: "string",
      required: true,
      validation: { pattern: "^txn_[a-z0-9]{26}$" },
      hint:
        "Must be `completed` for a refund, or `billed`/`past_due` and manually-collected for a " +
        "credit. A transaction with a refund already pending approval is rejected.",
    },
    {
      key: "action",
      label: "Action",
      type: "select",
      required: true,
      options: [
        { value: "refund", label: "Refund — return money to the original payment method" },
        { value: "credit", label: "Credit — reduce what is owed on a manual invoice" },
      ],
      hint:
        "Only these two can be created through the API. Chargebacks and reversals are written by " +
        "Paddle itself.",
    },
    {
      key: "reason",
      label: "Reason",
      type: "string",
      required: true,
      validation: { pattern: ".*\\S.*" },
      hint: "Shown in the Paddle dashboard and retained for record-keeping.",
    },
    {
      key: "type",
      label: "Type",
      type: "select",
      options: [
        { value: "full", label: "Full — adjust the transaction's grand total, no items needed" },
        { value: "partial", label: "Partial — adjust specific line items (default)" },
      ],
      hint: "Paddle defaults to `partial`, which requires Items. Choose `full` to adjust it all.",
    },
    {
      key: "items",
      label: "Items",
      type: "json",
      hint: 'Array of `{ "item_id": "txnitm_…", "type": "full" | "partial", "amount": "500" }`. ' +
        "The ids come from the transaction's `details.line_items[].id`. `amount` is required " +
        "when the item type is `partial`, in the lowest denomination as an integer string. " +
        "Required unless Type is `full`; 1–100 items.",
    },
    {
      key: "taxMode",
      label: "Tax mode",
      type: "select",
      options: [
        { value: "internal", label: "Internal — amounts include tax (default)" },
        { value: "external", label: "External — Paddle adds tax to the amounts" },
      ],
      hint: "Only meaningful for a partial adjustment.",
    },
  ],
  output: [{ key: "data", type: "object", label: "The created adjustment" }],

  execute(input, ctx) {
    return new PaddleClient(ctx).request("/adjustments", {
      method: "POST",
      body: compact({
        transaction_id: input.transactionId,
        action: input.action,
        reason: input.reason,
        type: input.type,
        items: asOptionalJson(input.items, "Items"),
        tax_mode: input.taxMode,
      }),
    });
  },
};

export default adjustmentCreate;
