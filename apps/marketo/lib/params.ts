import type { Param } from "@w6w/types";

export const LEAD_ID_PARAM: Param = {
  key: "leadId",
  label: "Lead ID",
  type: "number",
  required: true,
};

export const LIST_ID_PARAM: Param = {
  key: "listId",
  label: "List ID",
  type: "number",
  required: true,
  hint: "The static list's numeric ID, from the Admin > Database or Smart List UI.",
};

export const CAMPAIGN_ID_PARAM: Param = {
  key: "campaignId",
  label: "Campaign ID",
  type: "number",
  required: true,
};

export const LEAD_IDS_PARAM: Param = {
  key: "leadIds",
  label: "Lead IDs",
  type: "string",
  required: true,
  hint: "One or more lead IDs, comma-separated. Up to 300 (100 for Trigger Campaign).",
};

export const FIELDS_PARAM: Param = {
  key: "fields",
  label: "Fields",
  type: "string",
  hint: "Comma-separated API field names to return. Defaults to id, email, firstName, lastName, " +
    "createdAt, updatedAt when left blank.",
};

/** Paging shared by the two Asset API browse-style actions. Marketo pages these by offset. */
export const OFFSET_PARAMS: Param[] = [
  {
    key: "maxReturn",
    label: "Max Results",
    type: "number",
    default: 20,
    hint: "Default 20, maximum 200.",
  },
  {
    key: "offset",
    label: "Offset",
    type: "number",
    default: 0,
  },
];
