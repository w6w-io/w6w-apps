import type { Param } from "@w6w/types";

export const CONTACT_ID_PARAM: Param = {
  key: "contactId",
  label: "Contact ID",
  type: "number",
  required: true,
};

export const SEGMENT_ID_PARAM: Param = {
  key: "segmentId",
  label: "Segment ID",
  type: "number",
  required: true,
};

export const COMPANY_ID_PARAM: Param = {
  key: "companyId",
  label: "Company ID",
  type: "number",
  required: true,
};

export const CAMPAIGN_ID_PARAM: Param = {
  key: "campaignId",
  label: "Campaign ID",
  type: "number",
  required: true,
};

export const EMAIL_ID_PARAM: Param = {
  key: "emailId",
  label: "Email ID",
  type: "number",
  required: true,
};

export const SEARCH_PARAM: Param = {
  key: "search",
  label: "Search",
  type: "string",
  default: "",
  hint: "A Mautic search command, e.g. `email:*@acme.com` or `segment:vip-customers`.",
};

/** Paging, shared by every list action. Mautic pages by `start`/`limit`, not by page number. */
export const LIST_PARAMS: Param[] = [
  {
    key: "returnAll",
    label: "Return All",
    type: "boolean",
    default: false,
    hint: "Page through every result.",
  },
  {
    key: "limit",
    label: "Limit",
    type: "number",
    default: 30,
    hint: "Maximum results when Return All is off. Mautic's own default page size is 30.",
    showIf: { "==": [{ var: "returnAll" }, false] },
  },
];
