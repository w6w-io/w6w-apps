import type { Param } from "@w6w/types";

/**
 * Shared `Param` fragments for the Zendesk Sell actions.
 *
 * Every field name and constraint here is copied from the vendor's own
 * per-resource reference pages under
 * `developer.zendesk.com/api-reference/sales-crm/resources/*`, fetched
 * 2026-09-01, not inferred from a third-party integration directory.
 *
 * ## Deliberately out of scope
 *
 * The reference also documents `address[city]`-style bracketed query filters
 * and a `custom_fields[<name>]` filter/sort form on every list endpoint. Both
 * require a field to be pre-defined and marked *Filterable* in the caller's own
 * Sell account, so a static param can't offer a useful picker for them, and a
 * free-text bracket-syntax field is easy to get wrong silently (Sell ignores an
 * unrecognised filter rather than erroring). They are left out rather than
 * half-implemented; the list actions below cover the flat, always-present
 * filters only.
 */

/** `page` / `per_page`. Default 25, max 100 on every list endpoint this app uses. */
export function paginationParams(): Param[] {
  return [
    {
      key: "page",
      label: "Page",
      type: "number",
      validation: { integer: true, min: 1 },
      hint: "1-based. Omit for the first page.",
    },
    {
      key: "perPage",
      label: "Per page",
      type: "number",
      default: 25,
      validation: { integer: true, min: 1, max: 100 },
      hint: "Default 25, maximum 100.",
    },
  ];
}

/** Comma-separated resource IDs — the `ids` filter every list endpoint accepts. */
export const idsParam: Param = {
  key: "ids",
  label: "IDs",
  type: "string",
  hint: 'Comma-separated list of IDs to return, e.g. "1,2,3".',
};

/** `sort_by`, built per resource since the sortable field list differs by resource. */
export function sortByParam(fields: string[]): Param {
  return {
    key: "sortBy",
    label: "Sort by",
    type: "string",
    placeholder: fields[0],
    hint: `A field to sort by, optionally suffixed :asc or :desc (default :asc). One of: ${
      fields.join(", ")
    }.`,
  };
}

/** The `{line1, city, postal_code, state, country}` object used by every address field. */
export function addressParam(key: string, label: string, extra = ""): Param {
  return {
    key,
    label,
    type: "json",
    hint:
      `JSON object: {"line1", "city", "postal_code", "state", "country"}, all optional strings.${
        extra ? ` ${extra}` : ""
      }`,
  };
}

/** Tags are replaced wholesale on every write — the vendor does not merge. */
export const tagsParam: Param = {
  key: "tags",
  label: "Tags",
  type: "string",
  hint: "Comma-separated tags. Tags do not need to already exist. Replaces the ENTIRE tag set — " +
    "any tag left out is removed.",
};

/** `custom_fields` as a free-form JSON object — its keys are per-account, not statically knowable. */
export const customFieldsParam: Param = {
  key: "customFields",
  label: "Custom fields",
  type: "json",
  hint: 'JSON object of custom field name -> value, e.g. {"external_id": "SKU01"}. Custom fields ' +
    "must already be defined in the Sell account.",
};

export const ownerIdParam: Param = {
  key: "ownerId",
  label: "Owner user ID",
  type: "number",
  hint: "Defaults to the user who created the record.",
};

export interface AddressInput {
  line1?: string;
  city?: string;
  postal_code?: string;
  state?: string;
  country?: string;
}
