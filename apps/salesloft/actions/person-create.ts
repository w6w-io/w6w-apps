import type { ActionDefinition } from "@w6w/types";
import { compact, SalesloftClient } from "../lib/client.ts";

interface Input {
  firstName?: string;
  lastName?: string;
  emailAddress?: string;
  title?: string;
  accountId?: number;
  ownerId?: number;
  personStageId?: number;
  phone?: string;
  mobilePhone?: string;
  linkedinUrl?: string;
  doNotContact?: boolean;
  additionalFields?: Record<string, unknown>;
}

/**
 * POST /v2/people — create a person (Salesloft's term for a contact). The
 * full create body has 30+ optional fields (city/state/country, CRM
 * mapping, tags, custom_fields, …); this trims to the ones most workflows
 * set directly and passes the rest through `additionalFields`. Confirmed
 * against developers.salesloft.com/docs/api/people-create.
 */
const personCreate: ActionDefinition<Input> = {
  key: "person-create",
  type: "perform",
  resource: "person",
  title: "Create Person",
  description: "Create a new person (contact).",
  idempotent: false,
  params: [
    { key: "firstName", label: "First name", type: "string" },
    { key: "lastName", label: "Last name", type: "string" },
    { key: "emailAddress", label: "Email address", type: "string" },
    { key: "title", label: "Job title", type: "string" },
    {
      key: "accountId",
      label: "Account ID",
      type: "number",
      hint: "Links this person to an Account.",
    },
    { key: "ownerId", label: "Owner (user ID)", type: "number" },
    { key: "personStageId", label: "Person stage ID", type: "number" },
    { key: "phone", label: "Phone", type: "string" },
    { key: "mobilePhone", label: "Mobile phone", type: "string" },
    { key: "linkedinUrl", label: "LinkedIn URL", type: "string" },
    {
      key: "doNotContact",
      label: "Do not contact",
      type: "boolean",
      hint: "Opts this person out of all communication.",
    },
    {
      key: "additionalFields",
      label: "Additional fields",
      type: "json",
      advanced: true,
      hint:
        "Object of Salesloft person field names → values (e.g. city, country, custom_fields, tags), merged into the payload.",
    },
  ],
  output: [{ key: "data", type: "object", label: "Person" }],

  async execute(input, ctx) {
    const client = new SalesloftClient(ctx);
    return await client.request("/people", {
      method: "POST",
      body: compact({
        first_name: input.firstName,
        last_name: input.lastName,
        email_address: input.emailAddress,
        title: input.title,
        account_id: input.accountId,
        owner_id: input.ownerId,
        person_stage_id: input.personStageId,
        phone: input.phone,
        mobile_phone: input.mobilePhone,
        linkedin_url: input.linkedinUrl,
        do_not_contact: input.doNotContact,
        ...(input.additionalFields ?? {}),
      }),
    });
  },
};

export default personCreate;
