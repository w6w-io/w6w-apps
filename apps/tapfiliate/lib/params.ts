import type { Param } from "@w6w/types";

/**
 * Shared `Param` fragments for the Tapfiliate actions. Every field and enum
 * here was read off `https://tapfiliate.com/docs/rest/` (fetched 2026-09-05),
 * not inferred — see `lib/client.ts` for how that page was located.
 */

/**
 * The `?page` parameter the docs' "Pagination" section documents as global —
 * "Requests that return multiple items will be paginated to 25 items by
 * default. You can specify further pages with the ?page parameter" — stated
 * once, ahead of the endpoint reference, rather than repeated per endpoint.
 * Every list action here accepts it for that reason, even the ones whose own
 * section shows no `?page` in its example URL.
 */
export const pageParam: Param = {
  key: "page",
  label: "Page",
  type: "number",
  validation: { integer: true, min: 1 },
  hint: "1-based. Omit for the first page. Each page holds 25 items.",
};

/** `date_from`/`date_to` — shared by every list endpoint that documents a date range. */
export function dateRangeParams(): Param[] {
  return [
    { key: "dateFrom", label: "Date from", type: "date", hint: "Example: 2022-01-01" },
    { key: "dateTo", label: "Date to", type: "date", hint: "Example: 2025-12-31" },
  ];
}

export const programIdParam: Param = {
  key: "programId",
  label: "Program",
  type: "string",
  required: true,
  hint:
    "The program's id, as it appears in its URL on the platform (e.g. johns-affiliate-program).",
};

export const affiliateIdParam: Param = {
  key: "affiliateId",
  label: "Affiliate",
  type: "string",
  required: true,
  hint: "The affiliate's id (their referral-link slug, e.g. janejameson).",
};

export const customerIdParam: Param = {
  key: "id",
  label: "Customer",
  type: "string",
  required: true,
  placeholder: "cu_eXampl3",
  hint: "The Tapfiliate-generated customer id (the `id` field of a Customer object).",
};

export const conversionIdParam: Param = {
  key: "conversionId",
  label: "Conversion",
  type: "number",
  required: true,
  hint: "The conversion's numeric id.",
};

export const commissionIdParam: Param = {
  key: "commissionId",
  label: "Commission",
  type: "number",
  required: true,
  hint: "The commission's numeric id.",
};

/**
 * Free-form `meta_data` accepted by most create/update actions. Kept as a
 * `json` param rather than a generated form, since the caller defines the
 * keys.
 */
export const metaDataParam: Param = {
  key: "metaData",
  label: "Meta data",
  type: "json",
  hint: 'Arbitrary key/value data for this resource, e.g. {"foo": "bar"}.',
};

/**
 * The `company` object accepted by affiliate and affiliate-prospect create.
 * Kept as free-form JSON — its only documented field is `name`, but the
 * example responses also carry a `description` the docs never list as an
 * argument, so a generated two-field form would silently make that one
 * unreachable.
 */
export const companyParam: Param = {
  key: "company",
  label: "Company",
  type: "json",
  hint: 'e.g. {"name": "Example Inc.", "description": "…"}',
};

/**
 * The `address` object accepted by affiliate and affiliate-prospect create.
 * `address`, `postal_code`, `city` and `country.code` are required BY THE
 * VENDOR once an `address` object is sent at all — enforced there, not here,
 * since the whole object is optional.
 */
export const addressParam: Param = {
  key: "address",
  label: "Address",
  type: "json",
  hint: 'e.g. {"address": "1 Main St", "postal_code": "1011 VM", "city": "Amsterdam", ' +
    '"state": "Noord-Holland", "country": {"code": "NL"}}. `address`, `postal_code`, `city` and ' +
    "`country.code` are required if this object is sent at all.",
};

export const customFieldsParam: Param = {
  key: "customFields",
  label: "Custom fields",
  type: "json",
  hint: "Values for this account's affiliate custom fields, keyed by field id.",
};
