import type { Param } from "@w6w/types";

/**
 * Shared `Param` fragments for the Givebutter actions.
 *
 * Every enum here is copied verbatim from Givebutter's own OpenAPI 3.1
 * document (fetched 2026-09-05 from `https://givebutter.com/docs/api.json`),
 * not inferred from a widget page or a third-party integration.
 */

/**
 * `page` / `per_page` — Givebutter's documented page-number pagination.
 *
 * The vendor's own default (`per_page=20`) is kept as the param default
 * rather than overridden: unlike Apify's dataset endpoints, Givebutter's
 * ceiling is a modest 100 and every list here is a bounded CRM/donor resource,
 * so there is no equivalent of the "3.8 MB by default" footgun that justifies
 * shrinking the default elsewhere in this pack.
 */
export function paginationParams(): Param[] {
  return [
    {
      key: "page",
      label: "Page",
      type: "number",
      default: 1,
      validation: { integer: true, min: 1 },
      hint: "1-indexed page number.",
    },
    {
      key: "per_page",
      label: "Per page",
      type: "number",
      default: 20,
      validation: { integer: true, min: 1, max: 100 },
      hint: "Maximum 100, per Givebutter's own documented ceiling.",
    },
  ];
}

export interface PaginationInput {
  page?: number;
  per_page?: number;
}

export function paginationQuery(input: PaginationInput): Record<string, string | number> {
  const query: Record<string, string | number> = {};
  if (input.page !== undefined) query.page = input.page;
  if (input.per_page !== undefined) query.per_page = input.per_page;
  return query;
}

/** `ContactType`. */
export const contactTypeOptions = [
  { value: "individual", label: "Individual" },
  { value: "company", label: "Company" },
];

/** `GenderEnum`. */
export const genderOptions = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "other", label: "Other" },
];

/** `PaymentMethodEnum` — every method a manually-recorded transaction may declare. */
export const paymentMethodOptions = [
  { value: "ach", label: "ACH" },
  { value: "card", label: "Card" },
  { value: "cash", label: "Cash" },
  { value: "check", label: "Check" },
  { value: "digital_wallet", label: "Digital wallet" },
  { value: "donor_advised_fund", label: "Donor-advised fund" },
  { value: "paypal", label: "PayPal" },
  { value: "venmo", label: "Venmo" },
  { value: "cashapp", label: "Cash App" },
  { value: "terminal", label: "Terminal" },
  { value: "stock", label: "Stock" },
  { value: "in-kind", label: "In-kind" },
  { value: "property", label: "Property" },
  { value: "other", label: "Other" },
  { value: "none", label: "None" },
];

/**
 * A path-parameter id for a resource the OpenAPI document types as an
 * integer (`campaign`, `contact`, `household`, `pledge`, `message`).
 *
 * The `pattern` catches a malformed value (a slug, a UUID) before it ever
 * reaches the wire. It does NOT catch a well-formed but nonexistent id —
 * Givebutter's own routing can't tell those apart either. See `lib/client.ts`
 * for the measured 401-vs-404 boundary this is built on: a nonexistent
 * numeric id gets the identical branded marketing-site HTML 404 a garbage
 * string would, not a JSON API error.
 */
export function numericIdParam(label: string, hint?: string): Param {
  return {
    key: "id",
    label,
    type: "string",
    required: true,
    validation: { pattern: "^[0-9]+$" },
    hint: hint ?? `${label}'s numeric id, from a prior list or get call.`,
  };
}

/**
 * A path-parameter id for a resource the OpenAPI document types as an opaque
 * string (`fund`'s "fid", `webhook`'s id, `payout`'s "number", `plan`'s
 * "uid", `ticket`'s "uid", `transaction`'s "tid") rather than an integer.
 * Unlike the numeric ids above, there is no client-side shape to validate —
 * whatever the vendor returned from a prior read is the only legal input.
 */
export function idParam(label: string, hint?: string): Param {
  return {
    key: "id",
    label,
    type: "string",
    required: true,
    hint: hint ?? `${label}'s id, from a prior list or get call.`,
  };
}
