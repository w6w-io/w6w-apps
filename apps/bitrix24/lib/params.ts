import type { Param } from "@w6w/types";

/** The numeric identifier of a lead/contact/deal. */
export function idParam(entity: string): Param {
  return {
    key: "id",
    label: `${entity} ID`,
    type: "number",
    required: true,
    hint: `Returned by the "Add" and "List" actions for ${entity.toLowerCase()}s.`,
  };
}

/**
 * Escape hatch for anything the curated params below don't cover — any field
 * from the vendor's own field list (e.g. `ADDRESS_CITY`, `UTM_SOURCE`, a
 * custom `UF_CRM_...` field), passed straight through into `fields`. Curated
 * params win when both set the same key.
 */
export const EXTRA_FIELDS_PARAM: Param = {
  key: "extraFields",
  label: "Additional Fields",
  type: "json",
  advanced: true,
  hint: 'JSON object of any other Bitrix24 field, e.g. {"UTM_SOURCE": "google", ' +
    '"ADDRESS_CITY": "Austin"}. Merged under the fields already set above, which win on conflict. ' +
    "Custom fields (UF_CRM_...) only exist if the portal has defined them.",
};

/** Paging + selection, shared by every `list` action. */
export const LIST_PARAMS: Param[] = [
  {
    key: "select",
    label: "Fields To Return",
    type: "json",
    default: "",
    hint: 'JSON array of field names, e.g. ["ID","TITLE","STATUS_ID"]. "*" selects every ' +
      'standard field (excluding multiple fields like PHONE/EMAIL); "UF_*" selects every custom ' +
      "field. Defaults to the vendor's own default selection when omitted.",
  },
  {
    key: "filter",
    label: "Filter",
    type: "json",
    default: "",
    hint: 'JSON object of {"field": value}. Prefix a key with ">=", ">", "<=", "<", "@" (IN, ' +
      'value is an array), "!@" (NOT IN) or "%" (substring match) to change the comparison, e.g. ' +
      '{"%TITLE": "acme", ">=OPPORTUNITY": 1000}.',
  },
  {
    key: "order",
    label: "Sort",
    type: "json",
    default: "",
    hint: 'JSON object of {"field": "ASC"|"DESC"}, e.g. {"DATE_CREATE": "DESC"}.',
  },
  {
    key: "start",
    label: "Start Offset",
    type: "number",
    default: 0,
    hint: "Page size is fixed at 50. Pass back the previous response's `next` value (or " +
      "0, 50, 100, ... for page 1, 2, 3, ...) to page through results.",
  },
];

/** Gate on a destructive delete — Bitrix24 removes the record's whole history with it. */
export const CONFIRM_DELETE_PARAM: Param = {
  key: "confirm",
  label: "I understand this cannot be recovered",
  type: "boolean",
  required: true,
  default: false,
  hint: "Must be on. Bitrix24 deletes the record and every linked task, timeline entry and " +
    "history record with it — there is no trash to restore from.",
};
