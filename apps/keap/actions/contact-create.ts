import type { ActionDefinition } from "@w6w/types";
import { compact, KeapClient, V2 } from "../lib/client.ts";
import { asOptionalJson, duplicateOptions } from "../lib/params.ts";

/**
 * `POST /rest/v2/contacts` — Create a Contact.
 *
 * ## It is a create OR an upsert, and the difference is one query parameter
 *
 * Keap's own wording: "Optionally accepts a `duplicate_option` query parameter
 * … If a match is found using the option provided, **the existing contact will
 * be updated**. If an existing contact was not found using the
 * `duplicate_option` provided, a new contact record will be created. When
 * `duplicate_option` is not specified, a new contact is always created."
 *
 * That makes the parameter the single most consequential field on this action:
 * with it, running the same workflow twice keeps one contact; without it, you
 * get two. It is left empty by default, matching the API, and marked
 * non-idempotent because the default behaviour is not.
 *
 * ## At least one way to reach the contact is mandatory
 *
 * Also Keap's own wording: "Contact must contain at least one item in
 * `email_addresses`, `phone_numbers`, or `addresses`". The check is done here,
 * before the request, because the server-side failure is a bare 400.
 *
 * ## `region` and `country_code` travel together
 *
 * "`country_code` is required if `region` is specified." Note also that the
 * `Address.region` and `Address.country` fields are **deprecated for writes** —
 * Keap's schema says "Please use `region_code`/`country_code` for POST/PATCH
 * operations".
 */
interface Input {
  givenName?: string;
  familyName?: string;
  email?: string;
  emailField?: string;
  phone?: string;
  phoneField?: string;
  companyId?: string;
  jobTitle?: string;
  ownerId?: string;
  leadsourceId?: string;
  contactType?: string;
  addresses?: unknown;
  customFields?: unknown;
  extra?: unknown;
  duplicateOption?: string;
  fields?: string;
}

const contactCreate: ActionDefinition<Input> = {
  key: "contact-create",
  type: "perform",
  title: "Create Contact",
  resource: "contact",
  description:
    "Create a contact, or update the matching one when a duplicate-check strategy is chosen.",
  idempotent: false,
  params: [
    { key: "givenName", label: "First name", type: "string" },
    { key: "familyName", label: "Last name", type: "string" },
    { key: "email", label: "Email", type: "string", row: "email" },
    {
      key: "emailField",
      label: "Email slot",
      type: "select",
      row: "email",
      default: "EMAIL1",
      options: [
        { value: "EMAIL1", label: "EMAIL1 (primary)" },
        { value: "EMAIL2", label: "EMAIL2" },
        { value: "EMAIL3", label: "EMAIL3" },
      ],
      hint: "Keap stores three fixed email slots per contact, not a list.",
    },
    { key: "phone", label: "Phone", type: "string", row: "phone" },
    {
      key: "phoneField",
      label: "Phone slot",
      type: "select",
      row: "phone",
      default: "PHONE1",
      options: [
        { value: "PHONE1", label: "PHONE1 (primary)" },
        { value: "PHONE2", label: "PHONE2" },
        { value: "PHONE3", label: "PHONE3" },
        { value: "PHONE4", label: "PHONE4" },
        { value: "PHONE5", label: "PHONE5" },
      ],
    },
    { key: "companyId", label: "Company ID", type: "string", advanced: true },
    { key: "jobTitle", label: "Job title", type: "string", advanced: true },
    { key: "ownerId", label: "Owner user ID", type: "string", advanced: true },
    { key: "leadsourceId", label: "Lead source ID", type: "string", advanced: true },
    {
      key: "contactType",
      label: "Contact type",
      type: "string",
      advanced: true,
      placeholder: "Prospect",
    },
    {
      key: "addresses",
      label: "Addresses",
      type: "json",
      advanced: true,
      hint:
        "Array of address objects. Use `country_code` (ISO 3166-1 alpha-3) and `region_code`; " +
        "the long-form `country` and `region` are deprecated for writes, and `country_code` is " +
        "required whenever a region is given. `field` is BILLING, SHIPPING or OTHER.",
    },
    {
      key: "customFields",
      label: "Custom fields",
      type: "json",
      advanced: true,
      hint: 'Array of `{"id": "...", "content": ...}`. Ids come from GET /rest/v2/contacts/model.',
    },
    {
      key: "extra",
      label: "Additional properties",
      type: "json",
      advanced: true,
      hint: "Merged into the request body. Anything the fields above do not cover — birth_date, " +
        "social_accounts, preferred_locale, time_zone, website, spouse_name, source_type.",
    },
    {
      key: "duplicateOption",
      label: "Duplicate handling",
      type: "select",
      options: duplicateOptions,
      hint: "Leave empty to always create a new contact, which is what Keap does by default. " +
        "Choosing a strategy turns this into an upsert: a match is updated instead of " +
        "duplicated.",
    },
    {
      key: "fields",
      label: "Fields to return",
      type: "string",
      advanced: true,
      hint: "Comma-separated list of properties to include in the response.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Contact ID" },
    { key: "given_name", type: "string", label: "First name" },
    { key: "family_name", type: "string", label: "Last name" },
    { key: "email_addresses", type: "array", label: "Email addresses" },
  ],

  execute(input, ctx) {
    const addresses = asOptionalJson<unknown[]>(input.addresses, "Addresses");
    const customFields = asOptionalJson<unknown[]>(input.customFields, "Custom fields");
    const extra = asOptionalJson<Record<string, unknown>>(input.extra, "Additional properties");

    const emailAddresses = input.email
      ? [{ email: input.email, field: input.emailField || "EMAIL1" }]
      : undefined;
    const phoneNumbers = input.phone
      ? [{ number: input.phone, field: input.phoneField || "PHONE1" }]
      : undefined;

    const hasAddress = Array.isArray(addresses) && addresses.length > 0;
    if (!emailAddresses && !phoneNumbers && !hasAddress) {
      throw new Error(
        "Keap requires a new contact to carry at least one email address, phone number or " +
          "address. Supply one of Email, Phone or Addresses.",
      );
    }

    const body = compact({
      given_name: input.givenName,
      family_name: input.familyName,
      email_addresses: emailAddresses,
      phone_numbers: phoneNumbers,
      addresses,
      custom_fields: customFields,
      company: input.companyId ? { id: input.companyId } : undefined,
      job_title: input.jobTitle,
      owner_id: input.ownerId,
      leadsource_id: input.leadsourceId,
      contact_type: input.contactType,
      ...(extra ?? {}),
    });

    const client = new KeapClient(ctx);
    return client.json(`${V2}/contacts`, {
      method: "POST",
      query: { duplicate_option: input.duplicateOption, fields: input.fields },
      body,
    });
  },
};

export default contactCreate;
