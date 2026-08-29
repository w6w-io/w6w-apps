import type { ActionDefinition } from "@w6w/types";
import { compact, HunterClient } from "../lib/client.ts";

/**
 * `PUT /v2/leads/{id}` — update an existing lead by ID. Free. Answers
 * `204 No Content` on success — there is nothing to unwrap, unlike
 * `lead-upsert`'s `PUT /v2/leads`, which returns the updated lead.
 *
 * Idempotent: applying the same field values twice leaves the lead in the
 * same state.
 *
 * Custom attributes merge as a partial update — see `lead-upsert` for the
 * clear-a-field convention (`""`, not omission).
 */
interface Input {
  id: number;
  email?: string;
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
  customAttributes?: unknown;
}

const leadUpdate: ActionDefinition<Input> = {
  key: "lead-update",
  type: "perform",
  resource: "lead",
  title: "Update Lead",
  description: "Update an existing lead by ID. Free. Answers 204 No Content on success.",
  idempotent: true,
  params: [
    { key: "id", label: "Lead ID", type: "number", required: true },
    { key: "email", label: "Email", type: "string" },
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
    {
      key: "customAttributes",
      label: "Custom attributes",
      type: "json",
      hint: 'Partial merge — an omitted key is left unchanged; send "" to clear one.',
    },
  ],
  output: [],

  execute(input, ctx) {
    const { id, ...fields } = input;
    return new HunterClient(ctx).request(`/leads/${encodeURIComponent(String(id))}`, {
      method: "PUT",
      body: compact({
        email: fields.email,
        first_name: fields.firstName,
        last_name: fields.lastName,
        position: fields.position,
        company: fields.company,
        company_industry: fields.companyIndustry,
        company_size: fields.companySize,
        confidence_score: fields.confidenceScore,
        website: fields.website,
        country_code: fields.countryCode,
        linkedin_url: fields.linkedinUrl,
        phone_number: fields.phoneNumber,
        twitter: fields.twitter,
        notes: fields.notes,
        source: fields.source,
        custom_attributes: fields.customAttributes,
      }),
    });
  },
};

export default leadUpdate;
