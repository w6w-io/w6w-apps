import type { Param } from "@w6w/types";

/**
 * Shared `Param` fragments for the Mercury actions.
 *
 * Every shape here is transcribed from Mercury's own OpenAPI document (see
 * `lib/client.ts` for how it was obtained and verified), not inferred.
 */

export const accountIdParam: Param = {
  key: "accountId",
  label: "Account ID",
  type: "string",
  required: true,
  hint: "A Mercury account UUID — from the account-list action.",
};

/** `limit`/`order`/`start_after`/`end_before` — Mercury's cursor pagination, shared by every list endpoint. */
export function paginationParams(
  defaultLimit: number,
  defaultOrder: "asc" | "desc" = "asc",
): Param[] {
  return [
    {
      key: "limit",
      label: "Limit",
      type: "number",
      default: defaultLimit,
      validation: { integer: true, min: 1, max: 1000 },
      hint: "Maximum number of results to return. Allowed range 1–1000.",
    },
    {
      key: "order",
      label: "Order",
      type: "select",
      default: defaultOrder,
      options: [
        { value: "asc", label: "Ascending" },
        { value: "desc", label: "Descending" },
      ],
    },
    {
      key: "startAfter",
      label: "Start after (cursor)",
      type: "string",
      advanced: true,
      hint:
        "ID to start the page after (exclusive) — forward pagination. From a previous response's page.nextPage. Cannot combine with End before.",
    },
    {
      key: "endBefore",
      label: "End before (cursor)",
      type: "string",
      advanced: true,
      hint:
        "ID to end the page before (exclusive) — reverse pagination. Cannot combine with Start after.",
    },
  ];
}

export const cardIdParam: Param = {
  key: "cardId",
  label: "Card ID",
  type: "string",
  required: true,
  hint: "A card UUID — from the card-list action.",
};

export const recipientIdParam: Param = {
  key: "recipientId",
  label: "Recipient ID",
  type: "string",
  required: true,
  hint: "A recipient UUID — from the recipient-list action.",
};

export const categoryIdParam: Param = {
  key: "categoryId",
  label: "Category ID",
  type: "string",
  required: true,
  hint: "An expense category UUID — from the category-list action.",
};

export const customerIdParam: Param = {
  key: "customerId",
  label: "Customer ID",
  type: "string",
  required: true,
  hint: "An accounts-receivable customer UUID — from the customer-list action.",
};

export const invoiceIdParam: Param = {
  key: "invoiceId",
  label: "Invoice ID",
  type: "string",
  required: true,
  hint: "An accounts-receivable invoice UUID — from the invoice-list action.",
};

export const webhookIdParam: Param = {
  key: "webhookEndpointId",
  label: "Webhook Endpoint ID",
  type: "string",
  required: true,
  hint: "A webhook endpoint UUID — from the webhook-list action.",
};

export const transactionIdParam: Param = {
  key: "transactionId",
  label: "Transaction ID",
  type: "string",
  required: true,
  hint: "A transaction UUID — from the transaction-list action.",
};
