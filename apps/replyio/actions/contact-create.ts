import type { ActionDefinition } from "@w6w/types";
import { asOptionalJson, compact, ReplyClient } from "../lib/client.ts";
import { companySizeRequestOptions } from "../lib/params.ts";

/**
 * `POST /v3/contacts` — add a single contact. All fields are optional; provide
 * at minimum an email or a LinkedIn URL. Returns the contact with its new id.
 * Requires `contacts:write`.
 *
 * Not idempotent: Reply assigns a new id on every call, and this endpoint does
 * not document upsert-by-email behaviour (v1's `POST /v1/people` did; v3 does
 * not carry that note forward).
 */
interface Input {
  email?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  title?: string;
  company?: string;
  companySize?: string;
  industry?: string;
  city?: string;
  state?: string;
  country?: string;
  linkedInUrl?: string;
  notes?: string;
  accountId?: number;
  customFields?: unknown;
}

const contactCreate: ActionDefinition<Input> = {
  key: "contact-create",
  type: "perform",
  resource: "contact",
  title: "Create Contact",
  description: "Add a single contact with any profile and custom fields you have.",
  idempotent: false,
  params: [
    { key: "email", label: "Email", type: "string" },
    { key: "firstName", label: "First name", type: "string" },
    { key: "lastName", label: "Last name", type: "string" },
    { key: "phone", label: "Phone", type: "string" },
    { key: "title", label: "Job title", type: "string" },
    { key: "company", label: "Company", type: "string" },
    {
      key: "companySize",
      label: "Company size",
      type: "select",
      options: companySizeRequestOptions,
      hint:
        'Spelled PascalCase on write (e.g. "SelfEmployed") — Reply reads it back lowerCamelCase.',
    },
    { key: "industry", label: "Industry", type: "string" },
    { key: "city", label: "City", type: "string" },
    { key: "state", label: "State/province", type: "string" },
    { key: "country", label: "Country", type: "string" },
    { key: "linkedInUrl", label: "LinkedIn profile URL", type: "string" },
    { key: "notes", label: "Notes", type: "text" },
    {
      key: "accountId",
      label: "Account ID",
      type: "number",
      hint: "Links this contact to a company account.",
    },
    {
      key: "customFields",
      label: "Custom fields",
      type: "json",
      hint: 'Array of `{"key": "<field name>", "value": "<text>"}`.',
    },
  ],
  output: [
    { key: "id", type: "number", label: "Contact ID" },
    { key: "email", type: "string", label: "Email" },
  ],

  execute(input, ctx) {
    const body = compact({
      email: input.email,
      firstName: input.firstName,
      lastName: input.lastName,
      phone: input.phone,
      title: input.title,
      company: input.company,
      companySize: input.companySize,
      industry: input.industry,
      city: input.city,
      state: input.state,
      country: input.country,
      linkedInUrl: input.linkedInUrl,
      notes: input.notes,
      accountId: input.accountId,
      customFields: asOptionalJson(input.customFields, "Custom fields"),
    });
    return new ReplyClient(ctx).json("/contacts", { method: "POST", body });
  },
};

export default contactCreate;
