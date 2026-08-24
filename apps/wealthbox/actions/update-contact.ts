import type { ActionDefinition } from "@w6w/types";
import { ADDITIONAL_PROPERTIES_PARAM, compact, WealthboxClient } from "../lib/client.ts";

interface Input {
  contactId: number;
  firstName?: string;
  lastName?: string;
  middleName?: string;
  prefix?: string;
  suffix?: string;
  nickname?: string;
  jobTitle?: string;
  companyName?: string;
  backgroundInformation?: string;
  tags?: string[];
  emailAddresses?: unknown[];
  phoneNumbers?: unknown[];
  streetAddresses?: unknown[];
  assignedTo?: number;
  additionalProperties?: Record<string, unknown>;
}

/**
 * `PUT /v1/contacts/{id}` — update a Contact.
 *
 * Omitted fields are compacted out of the body rather than sent as `null`, so
 * a caller who only wants to change `jobTitle` cannot accidentally blank
 * every other field on the record.
 *
 * Idempotent: applying the same field values twice leaves the Contact in the
 * same state, so a retry after a network failure is safe.
 */
const updateContact: ActionDefinition<Input> = {
  key: "update-contact",
  type: "perform",
  resource: "contact",
  title: "Update Contact",
  description: "Update an existing Contact. Only the fields you supply change.",
  idempotent: true,
  params: [
    { key: "contactId", label: "Contact ID", type: "number", required: true },
    { key: "firstName", label: "First name", type: "string" },
    { key: "lastName", label: "Last name", type: "string" },
    { key: "middleName", label: "Middle name", type: "string" },
    { key: "prefix", label: "Prefix", type: "string" },
    { key: "suffix", label: "Suffix", type: "string" },
    { key: "nickname", label: "Nickname", type: "string" },
    { key: "jobTitle", label: "Job title", type: "string" },
    { key: "companyName", label: "Company name", type: "string" },
    { key: "backgroundInformation", label: "Background information", type: "text" },
    { key: "tags", label: "Tags", type: "array", item: { type: "string" } },
    {
      key: "emailAddresses",
      label: "Email addresses",
      type: "json",
      hint: 'Array of `{"address": "a@b.com", "kind": "Work", "principal": true}`.',
    },
    {
      key: "phoneNumbers",
      label: "Phone numbers",
      type: "json",
      hint: 'Array of `{"address": "555-0100", "kind": "Mobile", "principal": true}`.',
    },
    {
      key: "streetAddresses",
      label: "Street addresses",
      type: "json",
      hint: 'Array of `{"street_line_1": "...", "city": "...", "state": "...", "zip_code": ' +
        '"...", "country": "United States", "kind": "Home", "principal": true}`.',
    },
    { key: "assignedTo", label: "Assigned to user ID", type: "number" },
    ADDITIONAL_PROPERTIES_PARAM,
  ],
  output: [{ key: "id", type: "number", label: "Contact ID" }],

  execute(input, ctx) {
    const body = {
      ...compact({
        first_name: input.firstName,
        last_name: input.lastName,
        middle_name: input.middleName,
        prefix: input.prefix,
        suffix: input.suffix,
        nickname: input.nickname,
        job_title: input.jobTitle,
        company_name: input.companyName,
        background_information: input.backgroundInformation,
        tags: input.tags,
        email_addresses: input.emailAddresses,
        phone_numbers: input.phoneNumbers,
        street_addresses: input.streetAddresses,
        assigned_to: input.assignedTo,
      }),
      ...(input.additionalProperties ?? {}),
    };
    return new WealthboxClient(ctx).request(`/contacts/${encodeURIComponent(input.contactId)}`, {
      method: "PUT",
      body,
    });
  },
};

export default updateContact;
