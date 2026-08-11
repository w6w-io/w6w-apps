import type { ActionDefinition } from "@w6w/types";
import { PaddleClient, toList } from "../lib/client.ts";

/**
 * `GET /transactions/{transaction_id}` — one transaction, with optional
 * related entities.
 *
 * Each `include` value is only present when the transaction actually has that
 * relation — a transaction with no `discount_id` returns no `discount` key
 * rather than a null one, so downstream steps must not assume it exists.
 */
interface Input {
  transactionId: string;
  include?: string[] | string;
}

const transactionGet: ActionDefinition<Input> = {
  key: "transaction-get",
  type: "read",
  resource: "transaction",
  title: "Get Transaction",
  description:
    "Fetch a transaction, optionally with its customer, address, discount or adjustments.",
  params: [
    {
      key: "transactionId",
      label: "Transaction ID",
      type: "string",
      required: true,
      placeholder: "txn_01h04vsc0qhwtsbsxh3422wjr5",
      validation: { pattern: "^txn_[a-z0-9]{26}$" },
    },
    {
      key: "include",
      label: "Include",
      type: "multiselect",
      options: [
        { value: "customer", label: "Customer" },
        { value: "address", label: "Address" },
        { value: "business", label: "Business" },
        { value: "discount", label: "Discount" },
        { value: "adjustments", label: "Adjustments" },
        { value: "adjustments_totals", label: "Adjustment totals" },
        { value: "available_payment_methods", label: "Available payment methods" },
      ],
      hint: "Only returned when the transaction has the relation — do not assume the key exists.",
    },
  ],
  output: [{ key: "data", type: "object", label: "Transaction" }],

  execute(input, ctx) {
    return new PaddleClient(ctx).request(
      `/transactions/${encodeURIComponent(input.transactionId)}`,
      { query: { include: toList(input.include) } },
    );
  },
};

export default transactionGet;
