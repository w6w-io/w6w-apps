import type { Param } from "@w6w/types";

export const listKey: Param = {
  key: "listKey",
  label: "List Key",
  type: "string",
  required: true,
  hint: "The Zoho Campaigns mailing list key (`listkey`). Run List Mailing Lists to find one.",
};

export const campaignKey: Param = {
  key: "campaignKey",
  label: "Campaign Key",
  type: "string",
  required: true,
  hint: "The Zoho Campaigns campaign key (`campaignkey`). Run Recent Campaigns to find one.",
};

/** `fromindex`/`range`/`sort` — the paging shape most list endpoints share. */
export const pagingParams: Param[] = [
  { key: "fromindex", label: "From index", type: "number", default: 1 },
  { key: "range", label: "Range", type: "number", hint: "How many records to return." },
  {
    key: "sort",
    label: "Sort",
    type: "select",
    options: [{ value: "asc", label: "Ascending" }, { value: "desc", label: "Descending" }],
  },
];

/**
 * `contactinfo` — a JSON object of contact field -> value, always required to
 * include `Contact Email`. Subscribe/Unsubscribe/Do-Not-Mail all take this
 * exact shape (verified against `contact-subscribe.html`, `contact-unsubscribe.html`,
 * `do-not-mail.html`).
 */
export const contactInfo: Param = {
  key: "contactInfo",
  label: "Contact info",
  type: "json",
  required: true,
  hint: 'Field name -> value, must include "Contact Email", e.g. ' +
    '{ "Contact Email": "jai@zoho.com", "First Name": "Jai" }.',
};
