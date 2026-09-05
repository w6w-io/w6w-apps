import type { Param } from "@w6w/types";

/**
 * Shared `Param` fragments for the Teamleader Focus actions. Field names,
 * defaults and enums are copied verbatim from the vendor's own API reference
 * (`developer.focus.teamleader.eu/docs/api/*`, verified 2026-09-01), not
 * inferred from a sibling integration or from marketing copy.
 */

/** `page.size` / `page.number` — every `.list` endpoint uses this pair. */
export function pageParams(): Param[] {
  return [
    {
      key: "pageSize",
      label: "Page size",
      type: "number",
      default: 20,
      validation: { integer: true, min: 1 },
      hint: "Teamleader's own default and the value prefilled here.",
    },
    {
      key: "pageNumber",
      label: "Page number",
      type: "number",
      default: 1,
      validation: { integer: true, min: 1 },
    },
  ];
}

export interface PageInput {
  pageSize?: number;
  pageNumber?: number;
}

/** Build the `page` object Teamleader expects, omitting it when both are unset. */
export function pageBody(input: PageInput): { size: number; number: number } | undefined {
  if (input.pageSize === undefined && input.pageNumber === undefined) return undefined;
  return { size: input.pageSize ?? 20, number: input.pageNumber ?? 1 };
}

export const updatedSinceParam: Param = {
  key: "updatedSince",
  label: "Updated since",
  type: "datetime",
  hint: "ISO 8601 timestamp (e.g. 2016-02-04T16:44:33+00:00). Only records touched at or after " +
    "this time are returned.",
};

export const termParam = (filtersOn: string): Param => ({
  key: "term",
  label: "Search term",
  type: "string",
  hint: `Filters on ${filtersOn}.`,
});

export const idParam = (label: string, example: string): Param => ({
  key: "id",
  label,
  type: "string",
  required: true,
  placeholder: example,
});

export const idsParam: Param = {
  key: "ids",
  label: "IDs",
  type: "json",
  hint: 'Array of UUIDs to filter on, e.g. ["cb8da52a-…", "f8a57a6f-…"].',
};

export const tagsParam: Param = {
  key: "tags",
  label: "Tags",
  type: "json",
  hint: "Array of tag names.",
};

/**
 * `CurrencyCode` — the full enum Teamleader's schemas share across companies,
 * deals and invoicing. Copied verbatim from `companies.add`'s
 * `preferred_currency` field.
 */
export const CURRENCY_CODES = [
  "BAM",
  "CAD",
  "CHF",
  "CLP",
  "CNY",
  "COP",
  "CZK",
  "DKK",
  "EUR",
  "GBP",
  "INR",
  "ISK",
  "JPY",
  "MAD",
  "MXN",
  "NOK",
  "PEN",
  "PLN",
  "RON",
  "SEK",
  "TRY",
  "USD",
  "ZAR",
];

export const statusFilterParam = (options: string[]): Param => ({
  key: "status",
  label: "Status",
  type: "select",
  options: options.map((value) => ({ value, label: value })),
});

/**
 * `emails` / `telephones` / `addresses` / `custom_fields` — every contact and
 * company write endpoint accepts these as arrays of typed objects (see e.g.
 * `contacts.add`). Modelling each nested field as its own form Param would
 * mean 20+ inputs per action for structures that vary per account (custom
 * fields especially), so they are exposed as one `json` param each, matching
 * the vendor's own request body shape one-for-one — copy the "Example" body
 * from the relevant `developer.focus.teamleader.eu/docs/api/*` page.
 */
export const emailsParam: Param = {
  key: "emails",
  label: "Emails",
  type: "json",
  hint: 'Array of {"type": "primary", "email": "…"}.',
};

export const telephonesParam: Param = {
  key: "telephones",
  label: "Telephones",
  type: "json",
  hint: 'Array of {"type": "phone" | "mobile" | "fax", "number": "…"}.',
};

export const addressesParam: Param = {
  key: "addresses",
  label: "Addresses",
  type: "json",
  hint: 'Array of {"type": "primary" | "invoicing" | "delivery" | "visiting", "address": ' +
    '{"line_1", "postal_code", "city", "country", "area_level_two_id"?, "addressee"?}}.',
};

export const customFieldsParam: Param = {
  key: "customFields",
  label: "Custom fields",
  type: "json",
  hint: 'Array of {"id": "<custom field definition id>", "value": …}.',
};
