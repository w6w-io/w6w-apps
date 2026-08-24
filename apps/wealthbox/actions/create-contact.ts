import type { ActionDefinition } from "@w6w/types";
import { ADDITIONAL_PROPERTIES_PARAM, compact, WealthboxClient } from "../lib/client.ts";

interface Input {
  firstName: string;
  lastName: string;
  middleName?: string;
  prefix?: string;
  suffix?: string;
  nickname?: string;
  jobTitle?: string;
  companyName?: string;
  type?: string;
  backgroundInformation?: string;
  tags?: string[];
  emailAddresses?: unknown[];
  phoneNumbers?: unknown[];
  streetAddresses?: unknown[];
  assignedTo?: number;
  additionalProperties?: Record<string, unknown>;
}

/**
 * `POST /v1/contacts` — create a Contact (person, household, organization or
 * trust). dev.wealthbox.com's Contact object has well over 60 request
 * attributes (investment profile, drivers license, agreement dates, ...); this
 * action exposes the fields every integration needs and routes everything
 * else through `additionalProperties`, merged verbatim into the request body.
 *
 * Not idempotent: Wealthbox mints a new contact id per call with no
 * idempotency key on this endpoint, so a retry creates a duplicate.
 */
const createContact: ActionDefinition<Input> = {
  key: "create-contact",
  type: "perform",
  resource: "contact",
  title: "Create Contact",
  description: "Create a new Contact.",
  idempotent: false,
  params: [
    { key: "firstName", label: "First name", type: "string", required: true },
    { key: "lastName", label: "Last name", type: "string", required: true },
    { key: "middleName", label: "Middle name", type: "string" },
    { key: "prefix", label: "Prefix", type: "string", placeholder: "Mr." },
    { key: "suffix", label: "Suffix", type: "string" },
    { key: "nickname", label: "Nickname", type: "string" },
    { key: "jobTitle", label: "Job title", type: "string" },
    { key: "companyName", label: "Company name", type: "string" },
    {
      key: "type",
      label: "Contact type",
      type: "select",
      options: [
        { value: "Person", label: "Person" },
        { value: "Household", label: "Household" },
        { value: "Organization", label: "Organization" },
        { value: "Trust", label: "Trust" },
      ],
    },
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
        type: input.type,
        background_information: input.backgroundInformation,
        tags: input.tags,
        email_addresses: input.emailAddresses,
        phone_numbers: input.phoneNumbers,
        street_addresses: input.streetAddresses,
        assigned_to: input.assignedTo,
      }),
      ...(input.additionalProperties ?? {}),
    };
    return new WealthboxClient(ctx).request("/contacts", { method: "POST", body });
  },
};

export default createContact;
