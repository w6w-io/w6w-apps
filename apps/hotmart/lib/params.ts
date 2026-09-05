import type { Param } from "@w6w/types";

/**
 * Shared `Param` fragments and option lists for the Hotmart actions.
 *
 * Every enum here is copied verbatim from the "Return"/"Request parameters"
 * sections of Hotmart's own docs (fetched 2026-09-05 from
 * `developers.hotmart.com/docs/en/v1/...`), not inferred or borrowed from a
 * sibling integration.
 */

/** Purchase/transaction status — shared by sales-history, sales-summary, sales-users, etc. */
export const transactionStatusOptions = [
  { value: "APPROVED", label: "Approved" },
  { value: "BLOCKED", label: "Blocked" },
  { value: "CANCELLED", label: "Cancelled" },
  { value: "CHARGEBACK", label: "Chargeback" },
  { value: "COMPLETE", label: "Complete" },
  { value: "EXPIRED", label: "Expired" },
  { value: "NO_FUNDS", label: "No funds" },
  { value: "OVERDUE", label: "Overdue" },
  { value: "PARTIALLY_REFUNDED", label: "Partially refunded" },
  { value: "PRE_ORDER", label: "Pre-order" },
  { value: "PRINTED_BILLET", label: "Printed billet" },
  { value: "PROCESSING_TRANSACTION", label: "Processing transaction" },
  { value: "PROTESTED", label: "Protested" },
  { value: "REFUNDED", label: "Refunded" },
  { value: "STARTED", label: "Started" },
  { value: "UNDER_ANALISYS", label: "Under analysis" },
  { value: "WAITING_PAYMENT", label: "Waiting payment" },
];

/** Payment method the buyer used. */
export const paymentTypeOptions = [
  { value: "BILLET", label: "Billet (boleto)" },
  { value: "CASH_PAYMENT", label: "Cash payment" },
  { value: "CREDIT_CARD", label: "Credit card" },
  { value: "DIRECT_BANK_TRANSFER", label: "Direct bank transfer" },
  { value: "DIRECT_DEBIT", label: "Direct debit" },
  { value: "FINANCED_BILLET", label: "Financed billet" },
  { value: "FINANCED_INSTALLMENT", label: "Financed installment" },
  { value: "GOOGLE_PAY", label: "Google Pay" },
  { value: "HOTCARD", label: "Hotcard" },
  { value: "HYBRID", label: "Hybrid" },
  { value: "MANUAL_TRANSFER", label: "Manual transfer" },
  { value: "PAYPAL", label: "PayPal" },
  { value: "PAYPAL_INTERNACIONAL", label: "PayPal (international)" },
  { value: "PICPAY", label: "PicPay" },
  { value: "PIX", label: "Pix" },
  { value: "SAMSUNG_PAY", label: "Samsung Pay" },
  { value: "WALLET", label: "Wallet" },
];

/** How the account user received commission for a sale. */
export const commissionAsOptions = [
  { value: "PRODUCER", label: "Producer" },
  { value: "COPRODUCER", label: "Co-producer" },
  { value: "AFFILIATE", label: "Affiliate" },
];

/** Subscription lifecycle status, from `get-subscribers`. */
export const subscriptionStatusOptions = [
  { value: "ACTIVE", label: "Active" },
  { value: "INACTIVE", label: "Inactive" },
  { value: "DELAYED", label: "Delayed" },
  { value: "CANCELLED_BY_CUSTOMER", label: "Cancelled by customer" },
  { value: "CANCELLED_BY_SELLER", label: "Cancelled by seller" },
  { value: "CANCELLED_BY_ADMIN", label: "Cancelled by admin" },
  { value: "STARTED", label: "Started" },
  { value: "OVERDUE", label: "Overdue" },
];

/** Product lifecycle status, from `product-list`. */
export const productStatusOptions = [
  { value: "DRAFT", label: "Draft" },
  { value: "ACTIVE", label: "Active" },
  { value: "PAUSED", label: "Paused" },
  { value: "NOT_APPROVED", label: "Not approved" },
  { value: "IN_REVIEW", label: "In review" },
  { value: "DELETED", label: "Deleted" },
  { value: "CHANGES_PENDING_ON_PRODUCT", label: "Changes pending on product" },
];

/** Product format, from `product-list`. */
export const productFormatOptions = [
  { value: "EBOOK", label: "Ebook" },
  { value: "SOFTWARE", label: "Software" },
  { value: "MOBILE_APPS", label: "Mobile apps" },
  { value: "VIDEOS", label: "Videos" },
  { value: "AUDIOS", label: "Audios" },
  { value: "TEMPLATES", label: "Templates" },
  { value: "IMAGES", label: "Images" },
  { value: "ONLINE_COURSE", label: "Online course" },
  { value: "SERIAL_CODES", label: "Serial codes" },
  { value: "ETICKET", label: "E-ticket" },
  { value: "ONLINE_SERVICE", label: "Online service" },
  { value: "ONLINE_EVENT", label: "Online event" },
  { value: "BUNDLE", label: "Bundle" },
  { value: "COMMUNITY", label: "Community" },
  { value: "AGENT", label: "Agent" },
];

/**
 * The cursor-pagination pair every list endpoint shares: `max_results` caps
 * the page size, `page_token` walks it. Each endpoint documents its own
 * default/ceiling for `max_results`, passed in here rather than assumed.
 */
export function paginationParams(maxResultsHint: string): Param[] {
  return [
    {
      key: "maxResults",
      label: "Max results",
      type: "number",
      validation: { integer: true, min: 1 },
      hint: maxResultsHint,
    },
    {
      key: "pageToken",
      label: "Page token",
      type: "string",
      hint: "From a previous response's page_info.next_page_token or prev_page_token.",
    },
  ];
}

export interface PaginationInput {
  maxResults?: number;
  pageToken?: string;
}

export function paginationQuery(
  input: PaginationInput,
): Record<string, string | number | undefined> {
  return { max_results: input.maxResults, page_token: input.pageToken };
}

/** Epoch-milliseconds date-range filter, shared by every sales/subscription list endpoint. */
export function dateRangeParams(
  startLabel: string,
  startHint: string,
  endLabel: string,
  endHint: string,
): Param[] {
  return [
    { key: "startDate", label: startLabel, type: "number", hint: startHint },
    { key: "endDate", label: endLabel, type: "number", hint: endHint },
  ];
}

export const productIdParam: Param = {
  key: "productId",
  label: "Product ID",
  type: "number",
  hint: "The 7-digit product ID, from the List Products action.",
};

export const productIdRequiredParam: Param = {
  ...productIdParam,
  required: true,
};

export const transactionParam: Param = {
  key: "transaction",
  label: "Transaction",
  type: "string",
  hint: 'Unique transaction reference, e.g. "HP17715690036014".',
};

export const transactionRequiredParam: Param = {
  ...transactionParam,
  required: true,
};
