import type { Param } from "@w6w/types";

/**
 * Shared `Param` fragments for the Razorpay actions.
 *
 * Every field description below is transcribed from Razorpay's own OpenAPI
 * 3.0 document (`razorpay.com/openapi.json`, fetched 2026-09-01), not
 * inferred.
 */

/** `count`/`skip` — every list endpoint's pagination pair. Max 100, default 10/0. */
export function paginationParams(): Param[] {
  return [
    {
      key: "count",
      label: "Count",
      type: "number",
      default: 10,
      validation: { integer: true, min: 1, max: 100 },
      hint: "Records to return. Maximum 100.",
    },
    {
      key: "skip",
      label: "Skip",
      type: "number",
      default: 0,
      validation: { integer: true, min: 0 },
      hint: "Records to skip, for paging.",
    },
  ];
}

/** `from`/`to` — the Unix-timestamp created-at window most list endpoints also take. */
export function dateRangeParams(): Param[] {
  return [
    {
      key: "from",
      label: "From (Unix timestamp)",
      type: "number",
      validation: { integer: true },
      hint: "Only records created on or after this time.",
      advanced: true,
    },
    {
      key: "to",
      label: "To (Unix timestamp)",
      type: "number",
      validation: { integer: true },
      hint: "Only records created on or before this time.",
      advanced: true,
    },
  ];
}

/**
 * The amount hint every amount `Param` repeats verbatim: Razorpay's amounts
 * are integers in the smallest currency sub-unit, with two documented
 * exceptions (see `lib/client.ts`).
 */
export const AMOUNT_HINT =
  "Smallest currency sub-unit — paise for INR (50000 = ₹500). Three-decimal currencies " +
  "(KWD, BHD, OMR): drop the last decimal digit. Zero-decimal currencies (JPY): pass as-is.";

export function amountParam(label: string, required = true): Param {
  return {
    key: "amount",
    label,
    type: "number",
    required,
    validation: { integer: true, min: 1 },
    hint: AMOUNT_HINT,
  };
}

export const currencyParam: Param = {
  key: "currency",
  label: "Currency",
  type: "string",
  default: "INR",
  hint: "ISO 4217 currency code.",
};

/**
 * `notes` — Razorpay's free-form metadata bag, on nearly every create/update
 * body. Max 15 key-value pairs, each key and value at most 256 characters.
 */
export const notesParam: Param = {
  key: "notes",
  label: "Notes",
  type: "json",
  advanced: true,
  hint: "Up to 15 key-value pairs of custom metadata. Each key and value up to 256 characters.",
};

/** Accept a `json`/free-form param as either a parsed value or the string a user typed. */
export function asOptionalJson<T>(value: unknown, label: string): T | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string") return value as T;
  try {
    return JSON.parse(value) as T;
  } catch {
    throw new Error(`${label} is not valid JSON`);
  }
}

export function orderIdParam(hint?: string): Param {
  return {
    key: "id",
    label: "Order ID",
    type: "string",
    required: true,
    placeholder: "order_EKwxwAgItmmXdp",
    hint: hint ?? "Order ID (order_*).",
  };
}

export function paymentIdParam(hint?: string): Param {
  return {
    key: "id",
    label: "Payment ID",
    type: "string",
    required: true,
    placeholder: "pay_29QQoUBi66xm2f",
    hint: hint ?? "Payment ID (pay_*).",
  };
}

export function refundIdParam(): Param {
  return {
    key: "id",
    label: "Refund ID",
    type: "string",
    required: true,
    placeholder: "rfnd_1aa1b1a1B1aaB1",
    hint: "Refund ID (rfnd_*).",
  };
}

export function customerIdParam(): Param {
  return {
    key: "id",
    label: "Customer ID",
    type: "string",
    required: true,
    placeholder: "cust_1Aa00000000001",
    hint: "Customer ID (cust_*).",
  };
}

export function paymentLinkIdParam(): Param {
  return {
    key: "id",
    label: "Payment Link ID",
    type: "string",
    required: true,
    placeholder: "plink_JXPlxFgcqfql07",
    hint: "Payment Link ID (plink_*).",
  };
}

export function invoiceIdParam(): Param {
  return {
    key: "id",
    label: "Invoice ID",
    type: "string",
    required: true,
    placeholder: "inv_00000000000001",
    hint: "Invoice ID (inv_*).",
  };
}

export function subscriptionIdParam(): Param {
  return {
    key: "id",
    label: "Subscription ID",
    type: "string",
    required: true,
    placeholder: "sub_00000000000001",
    hint: "Subscription ID (sub_*).",
  };
}

export function settlementIdParam(): Param {
  return {
    key: "id",
    label: "Settlement ID",
    type: "string",
    required: true,
    placeholder: "setl_ILJnnGDVn9tCA0",
    hint: "Settlement ID (setl_*).",
  };
}

export function disputeIdParam(): Param {
  return {
    key: "id",
    label: "Dispute ID",
    type: "string",
    required: true,
    placeholder: "disp_FN6XcGVX9y9J97",
    hint: "Dispute ID (disp_*).",
  };
}

export function qrCodeIdParam(): Param {
  return {
    key: "id",
    label: "QR Code ID",
    type: "string",
    required: true,
    placeholder: "qr_HquUCV0JHrmYML",
    hint: "QR Code ID (qr_*).",
  };
}
