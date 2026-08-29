import type { ActionDefinition } from "@w6w/types";
import { compact, HunterClient } from "../lib/client.ts";

/**
 * `PUT /v2/leads` — create a lead if none exists for this email, or update
 * the existing one. Free. Idempotent by design — the vendor dedupes by
 * `email` — which makes this the retry-safe choice for an iterative loader,
 * unlike `POST /v2/leads` (`lead-create`).
 *
 * Custom attributes merge as a PARTIAL update on an existing lead: a field
 * omitted from the payload is left unchanged. To clear one, send it as an
 * empty string (`{"custom_attributes": {"slug": ""}}`), not by omitting it.
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
  customAttributes?: unknown;
}

const leadUpsert: ActionDefinition<Input> = {
  key: "lead-upsert",
  type: "perform",
  resource: "lead",
  title: "Create or Update Lead",
  description: "Create a lead by email if it doesn't exist, or update it if it does. Free.",
  idempotent: true,
  params: [
    { key: "email", label: "Email", type: "string", required: true },
    { key: "firstName", label: "First name", type: "string" },
    { key: "lastName", label: "Last name", type: "string" },
    { key: "position", label: "Position", type: "string" },
    { key: "company", label: "Company", type: "string" },
    { key: "companyIndustry", label: "Company industry", type: "string" },
    { key: "companySize", label: "Company size", type: "string" },
    {
      key: "confidenceScore",
      label: "Confidence score",
      type: "number",
      validation: { integer: true, min: 0, max: 100 },
    },
    { key: "website", label: "Website (domain)", type: "string" },
    { key: "countryCode", label: "Country code", type: "string" },
    { key: "linkedinUrl", label: "LinkedIn URL", type: "string" },
    { key: "phoneNumber", label: "Phone number", type: "string" },
    { key: "twitter", label: "Twitter handle", type: "string" },
    { key: "notes", label: "Notes", type: "text" },
    { key: "source", label: "Source", type: "string" },
    { key: "leadsListId", label: "Leads list ID", type: "number" },
    {
      key: "customAttributes",
      label: "Custom attributes",
      type: "json",
      hint: 'Partial merge on update — an omitted key is left unchanged; send "" to clear one.',
    },
  ],
  output: [
    { key: "data", type: "object", label: "id, email, ..., leads_list{}" },
  ],

  execute(input, ctx) {
    return new HunterClient(ctx).request("/leads", {
      method: "PUT",
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
        custom_attributes: input.customAttributes,
      }),
    });
  },
};

export default leadUpsert;
