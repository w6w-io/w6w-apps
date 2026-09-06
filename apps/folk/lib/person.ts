import type { Param } from "@w6w/types";
import { compact } from "./client.ts";

/**
 * Fields shared by `person-create` and `person-update`, mirroring the OAS
 * `AddPersonDto` schema exactly. Notably: the schema declares **no required
 * properties at all** — not even a name — so folk itself imposes no
 * server-side minimum here; the hints below say so rather than this app
 * inventing a requirement the vendor doesn't have.
 */
export interface PersonFieldsInput {
  fullName?: string;
  firstName?: string;
  lastName?: string;
  company?: string;
  jobTitle?: string;
  birthday?: string;
  emails?: string[];
  phones?: string[];
  urls?: string[];
  addresses?: string[];
  note?: string;
  customFields?: Record<string, string | string[]>;
}

export const personFieldParams: Param[] = [
  {
    key: "fullName",
    label: "Full name",
    type: "string",
    hint: "folk's `AddPersonDto` declares no required fields at all — this is a convenience, " +
      "not a hard requirement.",
  },
  { key: "firstName", label: "First name", type: "string", row: "person-name" },
  { key: "lastName", label: "Last name", type: "string", row: "person-name" },
  { key: "company", label: "Current company", type: "string" },
  { key: "jobTitle", label: "Job title", type: "string" },
  {
    key: "birthday",
    label: "Birthday",
    type: "string",
    advanced: true,
    hint: "Free-form string — folk's schema documents no specific date format for this field.",
  },
  { key: "emails", label: "Emails", type: "array", item: { type: "string" } },
  { key: "phones", label: "Phones", type: "array", item: { type: "string" } },
  { key: "urls", label: "URLs", type: "array", item: { type: "string" } },
  { key: "addresses", label: "Addresses", type: "array", item: { type: "string" } },
  { key: "note", label: "Note", type: "text", advanced: true },
  {
    key: "customFields",
    label: "Custom fields",
    type: "json",
    advanced: true,
    hint: 'Object keyed by field name, e.g. `{"Role": "Investor"}`; a `singleSelect`/' +
      "`multipleSelect` field takes an array of its option labels. See " +
      "`person-custom-fields-list` for a group's available fields.",
  },
];

/** Builds the request body for `person-create`/`person-update`, dropping unset keys. */
export function buildPersonBody(input: PersonFieldsInput): Record<string, unknown> {
  return compact({
    fullName: input.fullName,
    firstName: input.firstName,
    lastName: input.lastName,
    company: input.company,
    jobTitle: input.jobTitle,
    birthday: input.birthday,
    emails: input.emails,
    phones: input.phones,
    urls: input.urls,
    addresses: input.addresses,
    note: input.note,
    customFields: input.customFields,
  });
}
