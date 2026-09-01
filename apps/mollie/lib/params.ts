import type { Param } from "@w6w/types";

/**
 * Shared `Param` fragments for the Mollie actions.
 *
 * Every field name, requirement and description below is transcribed from
 * Mollie's own OpenAPI 3.1 documents (fetched from `docs.mollie.com`,
 * 2026-09-01), not inferred. See `lib/client.ts` for how the wire format was
 * verified.
 */

/** `{currency, value}` — every monetary amount in the Mollie API. `value` is a decimal STRING. */
export interface MollieAmount {
  currency: string;
  value: string;
}

export const AMOUNT_HINT =
  'Mollie amounts are objects: {"currency": "EUR", "value": "10.00"}. `value` is an exact ' +
  "decimal STRING with the currency's natural number of decimals — never an integer of cents.";

/**
 * Two flat `Param`s (`<prefix>Value`, `<prefix>Currency`) laid out on one row,
 * for a single `{currency, value}` amount field. Call `amountFrom` in
 * `execute` to fold them back into the object Mollie expects.
 */
export function amountParams(prefix: string, label: string, required = true): Param[] {
  return [
    {
      key: `${prefix}Value`,
      label: `${label} — value`,
      type: "string",
      required,
      row: prefix,
      placeholder: "10.00",
      hint: AMOUNT_HINT,
    },
    {
      key: `${prefix}Currency`,
      label: `${label} — currency`,
      type: "string",
      required,
      row: prefix,
      default: "EUR",
      hint: "A three-character ISO 4217 currency code.",
    },
  ];
}

/** Fold `<prefix>Value`/`<prefix>Currency` input fields back into `{currency, value}`. */
export function amountFrom(input: object, prefix: string): MollieAmount | undefined {
  const rec = input as Record<string, unknown>;
  const value = rec[`${prefix}Value`] as string | undefined;
  const currency = rec[`${prefix}Currency`] as string | undefined;
  if (!value) return undefined;
  return { currency: currency || "EUR", value };
}

/** `from`/`limit` — the cursor-pagination pair every v2 list endpoint takes. Max 250. */
export function paginationParams(): Param[] {
  return [
    {
      key: "from",
      label: "From (ID)",
      type: "string",
      advanced: true,
      hint: "Cursor: the ID of the first object in the desired page. Omit for the first page.",
    },
    {
      key: "limit",
      label: "Limit",
      type: "number",
      default: 50,
      validation: { integer: true, min: 1, max: 250 },
      hint: "Objects per page. Maximum 250.",
    },
  ];
}

/** `sort` — `desc` (default, older-first... actually newer-first) or `asc`. Not every list supports it. */
export const sortParam: Param = {
  key: "sort",
  label: "Sort",
  type: "select",
  advanced: true,
  options: [
    { label: "Newest first (default)", value: "desc" },
    { label: "Oldest first", value: "asc" },
  ],
  hint: "Direction to sort by creation date.",
};

/**
 * `testmode` — required for an Advanced Access Token / OAuth token to reach
 * test-mode data; irrelevant for an API key, which is already test_/live_
 * scoped by its own prefix. Included as advanced on every action so an
 * organization-level token can use it.
 */
export const testmodeParam: Param = {
  key: "testmode",
  label: "Test mode",
  type: "boolean",
  advanced: true,
  hint: "Only needed with an Advanced Access Token or OAuth token, which are not test_/live_ " +
    "scoped the way an API key is. Ignored by a plain API key connection.",
};

/**
 * `profileId` — required for an Advanced Access Token / OAuth token acting on
 * behalf of an organization with multiple website profiles; an API key is
 * already scoped to one profile and does not need it.
 */
export const profileIdParam: Param = {
  key: "profileId",
  label: "Profile ID",
  type: "string",
  advanced: true,
  placeholder: "pfl_XXXXXXXXXX",
  hint: "Only needed with an Advanced Access Token or OAuth token spanning several website " +
    "profiles. An API key is already scoped to a single profile.",
};

export function paymentIdParam(hint?: string): Param {
  return {
    key: "paymentId",
    label: "Payment ID",
    type: "string",
    required: true,
    placeholder: "tr_7UhSN1zuXS",
    hint: hint ?? "Payment ID (tr_*).",
  };
}

export function refundIdParam(): Param {
  return {
    key: "refundId",
    label: "Refund ID",
    type: "string",
    required: true,
    placeholder: "re_4qqhO89gsT",
    hint: "Refund ID (re_*).",
  };
}

export function chargebackIdParam(): Param {
  return {
    key: "chargebackId",
    label: "Chargeback ID",
    type: "string",
    required: true,
    placeholder: "chb_n9z0tp",
    hint: "Chargeback ID (chb_*).",
  };
}

export function methodIdParam(): Param {
  return {
    key: "methodId",
    label: "Method ID",
    type: "string",
    required: true,
    placeholder: "ideal",
    hint: "Payment method id, e.g. ideal, creditcard, paypal, bancontact.",
  };
}

export function paymentLinkIdParam(): Param {
  return {
    key: "paymentLinkId",
    label: "Payment Link ID",
    type: "string",
    required: true,
    placeholder: "pl_4Y0eZitmBnQ6IDoMqZQKh",
    hint: "Payment Link ID (pl_*).",
  };
}

export function customerIdParam(): Param {
  return {
    key: "customerId",
    label: "Customer ID",
    type: "string",
    required: true,
    placeholder: "cst_8wmqcHMN4U",
    hint: "Customer ID (cst_*).",
  };
}

export function mandateIdParam(): Param {
  return {
    key: "mandateId",
    label: "Mandate ID",
    type: "string",
    required: true,
    placeholder: "mdt_h3xkgt3",
    hint: "Mandate ID (mdt_*).",
  };
}

export function subscriptionIdParam(): Param {
  return {
    key: "subscriptionId",
    label: "Subscription ID",
    type: "string",
    required: true,
    placeholder: "sub_rVKGtNd6s3",
    hint: "Subscription ID (sub_*).",
  };
}

export function profileIdPathParam(): Param {
  return {
    key: "profileId",
    label: "Profile ID",
    type: "string",
    required: true,
    placeholder: "pfl_XXXXXXXXXX",
    hint: "Profile ID (pfl_*).",
  };
}

/**
 * Mollie's free-form metadata bag: a string, number, JSON object or array of
 * strings, echoed back verbatim on every fetch. Accepted here as a `json`
 * param the caller may also type as a plain JSON-encoded string.
 */
export const metadataParam: Param = {
  key: "metadata",
  label: "Metadata",
  type: "json",
  advanced: true,
  hint: "Any JSON-serializable value (string, number, object or array of strings). Echoed back " +
    "on every fetch. Roughly 1kB budget.",
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
