import type { ActionDefinition } from "@w6w/types";
import { PaddleClient, toList } from "../lib/client.ts";
import {
  collectionModeOptions,
  idsParam,
  orderByParam,
  paginationParams,
  transactionStatusOptions,
} from "../lib/params.ts";

/**
 * `GET /transactions` — list transactions.
 *
 * ## The page size is 30 and cannot be raised
 *
 * Every other list in this app takes `per_page` up to 200 (adjustments, 50).
 * Transactions is documented as "Default: `30`; Maximum: `30`" — asking for
 * more silently returns 30. A report over a busy month is therefore many
 * requests, against a 240/minute limit, and the hint says so up front.
 *
 * ## The date filters take comparison operators
 *
 * `billed_at`, `created_at` and `updated_at` accept a bare RFC 3339 datetime
 * *or* one bracketed with `[LT]`, `[LTE]`, `[GT]`, `[GTE]` —
 * `created_at[GTE]=2026-08-01T00:00:00Z`. That syntax is unusual enough that
 * the operator goes in the value, not in a separate field, and the hint gives
 * an example.
 */
interface Input {
  ids?: string;
  customerId?: string;
  subscriptionId?: string;
  status?: string[] | string;
  collectionMode?: string;
  invoiceNumber?: string;
  billedAt?: string;
  createdAt?: string;
  updatedAt?: string;
  include?: string[] | string;
  orderBy?: string;
  perPage?: number;
  after?: string;
}

const transactionList: ActionDefinition<Input> = {
  key: "transaction-list",
  type: "search",
  resource: "transaction",
  title: "List Transactions",
  description: "List transactions. Pages are capped at 30 results — this endpoint cannot go wider.",
  params: [
    idsParam,
    {
      key: "customerId",
      label: "Customer ID",
      type: "string",
      hint: "Comma-separated for several.",
    },
    {
      key: "subscriptionId",
      label: "Subscription ID",
      type: "string",
      hint: "Comma-separated for several. Pass `null` for transactions with no subscription.",
    },
    { key: "status", label: "Status", type: "multiselect", options: transactionStatusOptions },
    {
      key: "collectionMode",
      label: "Collection mode",
      type: "select",
      options: collectionModeOptions,
    },
    {
      key: "invoiceNumber",
      label: "Invoice number",
      type: "string",
      hint: "Comma-separated for several.",
    },
    {
      key: "billedAt",
      label: "Billed at",
      type: "string",
      placeholder: "[GTE]2026-08-01T00:00:00Z",
      hint: "An RFC 3339 datetime, optionally prefixed with a `[LT]`, `[LTE]`, `[GT]` or `[GTE]` " +
        "operator.",
    },
    {
      key: "createdAt",
      label: "Created at",
      type: "string",
      hint: "Same operator syntax as Billed at.",
    },
    {
      key: "updatedAt",
      label: "Updated at",
      type: "string",
      hint: "Same operator syntax as Billed at.",
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
      hint: "Each is only present when the transaction actually has one.",
    },
    orderByParam("`billed_at`, `created_at`, `id`, `updated_at`"),
    ...paginationParams("Default 30 and maximum 30 — this endpoint ignores anything larger."),
  ],
  output: [
    { key: "data", type: "array", label: "Transactions" },
    { key: "meta", type: "object", label: "Request id and pagination cursor" },
  ],

  execute(input, ctx) {
    return new PaddleClient(ctx).envelope("/transactions", {
      query: {
        id: toList(input.ids),
        customer_id: toList(input.customerId),
        subscription_id: toList(input.subscriptionId),
        status: toList(input.status),
        collection_mode: input.collectionMode,
        invoice_number: toList(input.invoiceNumber),
        billed_at: input.billedAt,
        created_at: input.createdAt,
        updated_at: input.updatedAt,
        include: toList(input.include),
        order_by: input.orderBy,
        per_page: input.perPage,
        after: input.after,
      },
    });
  },
};

export default transactionList;
