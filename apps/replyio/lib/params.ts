import type { Param } from "@w6w/types";

/**
 * Shared `Param` fragments for the Reply.io actions. Copied field-for-field
 * from `docs.reply.io/api-reference/bundled.yaml`, fetched 2026-09-01.
 */

/**
 * `top`/`skip` — the pagination pair every v3 list endpoint in this app's
 * surface uses. The vendor's own default is 25 and its ceiling is 1,000; both
 * are stated here rather than silently prefilled, since 25 is already a safe
 * default (unlike Apify's 1,000-record default, there is no footgun to guard
 * against).
 */
export function paginationParams(): Param[] {
  return [
    {
      key: "top",
      label: "Limit",
      type: "number",
      default: 25,
      validation: { integer: true, min: 1, max: 1000 },
      hint: "Maximum number of items to return. Reply's own default is 25, maximum 1000.",
    },
    {
      key: "skip",
      label: "Offset",
      type: "number",
      validation: { integer: true, min: 0 },
      hint: "Number of items to skip from the start. Defaults to 0.",
    },
  ];
}

export const contactIdParam: Param = {
  key: "id",
  label: "Contact ID",
  type: "number",
  required: true,
  hint: "Reply's numeric contact id, from a Get/List/Filter Contacts result.",
};

export const sequenceIdParam: Param = {
  key: "id",
  label: "Sequence ID",
  type: "number",
  required: true,
  hint: "Reply's numeric sequence id, from a List Sequences result. Reply calls this a " +
    '"sequence" in the v3 API and the UI; it is the same object v1/v2 called a "campaign".',
};

/**
 * `companySize` — the enum is spelled with **two different casings** depending
 * on which way the field travels, per the OpenAPI document's own separate
 * request/response schemas. Getting this wrong is a silent-failure trap: Reply
 * does not reject the wrong casing outright on every field, so a request built
 * against the response casing can look fine in testing and misfile data.
 *
 * - **Request body** (contact create/update): PascalCase — `"SelfEmployed"`.
 * - **Response body** (contact read, and the reporting filter's `companySizes`,
 *   which mirrors the response schema): camelCase — `"selfEmployed"`.
 */
export const companySizeRequestOptions = [
  { value: "Empty", label: "Unknown" },
  { value: "SelfEmployed", label: "Self-employed" },
  { value: "Ten", label: "1–10" },
  { value: "Fifty", label: "11–50" },
  { value: "TwoHundred", label: "51–200" },
  { value: "FiveHundred", label: "201–500" },
  { value: "OneThousand", label: "501–1,000" },
  { value: "FiveThousand", label: "1,001–5,000" },
  { value: "TenThousand", label: "5,001–10,000" },
  { value: "OverTenThousand", label: "10,000+" },
];

export const companySizeResponseOptions = [
  { value: "empty", label: "Unknown" },
  { value: "selfEmployed", label: "Self-employed" },
  { value: "ten", label: "1–10" },
  { value: "fifty", label: "11–50" },
  { value: "twoHundred", label: "51–200" },
  { value: "fiveHundred", label: "201–500" },
  { value: "oneThousand", label: "501–1,000" },
  { value: "fiveThousand", label: "1,001–5,000" },
  { value: "tenThousand", label: "5,001–10,000" },
  { value: "overTenThousand", label: "10,000+" },
];
