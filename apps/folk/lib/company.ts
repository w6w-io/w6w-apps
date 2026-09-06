import type { Param } from "@w6w/types";
import { compact } from "./client.ts";

/**
 * Fields shared by `company-create` and `company-update`, mirroring the OAS
 * `AddCompanyDto` schema exactly — again, no properties are marked required.
 */
export interface CompanyFieldsInput {
  name?: string;
  emails?: string[];
  phones?: string[];
  urls?: string[];
  addresses?: string[];
  customFields?: Record<string, string | string[]>;
}

export const companyFieldParams: Param[] = [
  { key: "name", label: "Name", type: "string" },
  { key: "emails", label: "Emails", type: "array", item: { type: "string" } },
  { key: "phones", label: "Phones", type: "array", item: { type: "string" } },
  { key: "urls", label: "URLs", type: "array", item: { type: "string" } },
  { key: "addresses", label: "Addresses", type: "array", item: { type: "string" } },
  {
    key: "customFields",
    label: "Custom fields",
    type: "json",
    advanced: true,
    hint: 'Object keyed by field name, e.g. `{"Stage": "Seed"}`; a `singleSelect`/' +
      "`multipleSelect` field takes an array of its option labels. See " +
      "`company-custom-fields-list` for a group's available fields.",
  },
];

/** Builds the request body for `company-create`/`company-update`, dropping unset keys. */
export function buildCompanyBody(input: CompanyFieldsInput): Record<string, unknown> {
  return compact({
    name: input.name,
    emails: input.emails,
    phones: input.phones,
    urls: input.urls,
    addresses: input.addresses,
    customFields: input.customFields,
  });
}
