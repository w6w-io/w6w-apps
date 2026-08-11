import type { ActionDefinition } from "@w6w/types";
import { compact, KeapClient, V2 } from "../lib/client.ts";
import { asOptionalJson } from "../lib/params.ts";

/**
 * `POST /rest/v2/companies` — Create a Company.
 *
 * A Keap "company" is a contact record wearing a different hat, and the request
 * schema shows it: alongside `company_name` and `website` it carries
 * `first_name`, `last_name`, `job_title`, `birth_date`, `spouse_name` and
 * `assistant_phone` — the primary *person* at the company, stored on the
 * company record itself rather than as a linked contact. Those are exposed
 * through the additional-properties field rather than promoted to first-class
 * params, because filling them in is almost always a sign you wanted a contact.
 *
 * Unlike a contact, a company has no documented minimum: `company_name` alone
 * is accepted. `email_address`, `phone_number` and `fax_number` are single
 * objects here, not the arrays the contact schema uses.
 */
interface Input {
  companyName: string;
  email?: string;
  phone?: string;
  website?: string;
  address?: unknown;
  notes?: string;
  ownerId?: string;
  customFields?: unknown;
  extra?: unknown;
}

const companyCreate: ActionDefinition<Input> = {
  key: "company-create",
  type: "perform",
  title: "Create Company",
  resource: "company",
  description: "Create a company record.",
  // Keap performs no duplicate check on companies — there is no
  // `duplicate_option` equivalent here — so a retry creates a second company.
  idempotent: false,
  params: [
    { key: "companyName", label: "Company name", type: "string", required: true },
    {
      key: "email",
      label: "Email",
      type: "string",
      hint: "A single address, not a list — the company schema differs from the contact one here.",
    },
    { key: "phone", label: "Phone", type: "string" },
    { key: "website", label: "Website", type: "string" },
    {
      key: "address",
      label: "Address",
      type: "json",
      advanced: true,
      hint: "One address object. Use `country_code` (ISO 3166-1 alpha-3) and `region_code`; the " +
        "long-form `country` and `region` are deprecated for writes.",
    },
    { key: "notes", label: "Notes", type: "text", advanced: true },
    { key: "ownerId", label: "Owner user ID", type: "string", advanced: true },
    {
      key: "customFields",
      label: "Custom fields",
      type: "json",
      advanced: true,
      hint: 'Array of `{"id": "...", "content": ...}`. Ids come from GET /rest/v2/companies/model.',
    },
    {
      key: "extra",
      label: "Additional properties",
      type: "json",
      advanced: true,
      hint: "Merged into the request body — first_name, last_name, job_title, title, suffix, " +
        "billing_information, contact_type, referral_code and the rest of the person-shaped " +
        "properties a Keap company record carries.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Company ID" },
    { key: "company_name", type: "string", label: "Name" },
    { key: "create_time", type: "string", label: "Created at" },
  ],

  execute(input, ctx) {
    const body = compact({
      company_name: input.companyName,
      email_address: input.email ? { email: input.email } : undefined,
      phone_number: input.phone ? { number: input.phone } : undefined,
      website: input.website,
      address: asOptionalJson<Record<string, unknown>>(input.address, "Address"),
      notes: input.notes,
      owner_id: input.ownerId,
      custom_fields: asOptionalJson<unknown[]>(input.customFields, "Custom fields"),
      ...(asOptionalJson<Record<string, unknown>>(input.extra, "Additional properties") ?? {}),
    });
    const client = new KeapClient(ctx);
    return client.json(`${V2}/companies`, { method: "POST", body });
  },
};

export default companyCreate;
