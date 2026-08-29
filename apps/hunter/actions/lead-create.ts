import type { ActionDefinition } from "@w6w/types";
import { compact, HunterClient } from "../lib/client.ts";

/**
 * `POST /v2/leads` — create a new lead. Free.
 *
 * Not idempotent: calling this twice with the same email creates two leads.
 * Use `lead-upsert` (`PUT /v2/leads`) instead for a retry-safe loader that
 * dedupes by email.
 *
 * `leadsListName` cannot be combined with `leadsListId` (a 422 if both are
 * set) — omit both to save into the last list created.
 */
interface Input {
  email: string;
  firstName?: string;
  lastName?: string;
  position?: string;
  company?: string;
  companyIndustry?: string;
  companySize?: string;
  confidenceScore?: number;
  website?: string;
  countryCode?: string;
  linkedinUrl?: string;
  phoneNumber?: string;
  twitter?: string;
  notes?: string;
  source?: string;
  leadsListId?: number;
  leadsListName?: string;
  customAttributes?: unknown;
}

const leadCreate: ActionDefinition<Input> = {
  key: "lead-create",
  type: "perform",
  resource: "lead",
  title: "Create Lead",
  description: "Create a new lead. Free. Not idempotent — use Upsert Lead to dedupe by email.",
  idempotent: false,
  params: [
    { key: "email", label: "Email", type: "string", required: true },
    { key: "firstName", label: "First name", type: "string" },
    { key: "lastName", label: "Last name", type: "string" },
    { key: "position", label: "Position", type: "string" },
    { key: "company", label: "Company", type: "string" },
    {
      key: "companyIndustry",
      label: "Company industry",
      type: "string",
      hint: "Free text. Hunter's suggested vocabulary: Technology, Finance, Retail, Health, " +
        "Education & Career, Internet & Telecom, and others — see the README.",
    },
    { key: "companySize", label: "Company size", type: "string", placeholder: "201-500 employees" },
    {
      key: "confidenceScore",
      label: "Confidence score",
      type: "number",
      validation: { integer: true, min: 0, max: 100 },
      hint: "0–100. In Hunter's own products, this is the score Email Finder returned.",
    },
    { key: "website", label: "Website (domain)", type: "string" },
    {
      key: "countryCode",
      label: "Country code",
      type: "string",
      hint: "ISO 3166-1 alpha-2, e.g. US.",
    },
    { key: "linkedinUrl", label: "LinkedIn URL", type: "string" },
    { key: "phoneNumber", label: "Phone number", type: "string" },
    { key: "twitter", label: "Twitter handle", type: "string" },
    { key: "notes", label: "Notes", type: "text" },
    { key: "source", label: "Source", type: "string" },
    {
      key: "leadsListId",
      label: "Leads list ID",
      type: "number",
      hint: "Cannot be combined with Leads list name. Defaults to the last list created.",
    },
    {
      key: "leadsListName",
      label: "Leads list name",
      type: "string",
      hint: "Reuses an existing list with this name (case-insensitive) or creates one. Cannot be " +
        "combined with Leads list ID.",
    },
    {
      key: "customAttributes",
      label: "Custom attributes",
      type: "json",
      hint: '{ "slug": "value" }. A slug that isn\'t one of your team\'s custom attributes ' +
        "returns a 422.",
    },
  ],
  output: [
    { key: "data", type: "object", label: "id, email, ..., leads_list{}, created_at" },
  ],

  execute(input, ctx) {
    return new HunterClient(ctx).request("/leads", {
      method: "POST",
      body: compact({
        email: input.email,
        first_name: input.firstName,
        last_name: input.lastName,
        position: input.position,
        company: input.company,
        company_industry: input.companyIndustry,
        company_size: input.companySize,
        confidence_score: input.confidenceScore,
        website: input.website,
        country_code: input.countryCode,
        linkedin_url: input.linkedinUrl,
        phone_number: input.phoneNumber,
        twitter: input.twitter,
        notes: input.notes,
        source: input.source,
        leads_list_id: input.leadsListId,
        leads_list_name: input.leadsListName,
        custom_attributes: input.customAttributes,
      }),
    });
  },
};

export default leadCreate;
