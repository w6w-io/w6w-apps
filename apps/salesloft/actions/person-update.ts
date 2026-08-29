import type { ActionDefinition } from "@w6w/types";
import { compact, SalesloftClient } from "../lib/client.ts";

interface Input {
  id: number;
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

/** PUT /v2/people/:id — update a person. Same field set as create. */
const personUpdate: ActionDefinition<Input> = {
  key: "person-update",
  type: "perform",
  resource: "person",
  title: "Update Person",
  description: "Update an existing person.",
  idempotent: true,
  params: [
    { key: "id", label: "Person ID", type: "number", required: true },
    { key: "firstName", label: "First name", type: "string" },
    { key: "lastName", label: "Last name", type: "string" },
    { key: "emailAddress", label: "Email address", type: "string" },
    { key: "title", label: "Job title", type: "string" },
    { key: "accountId", label: "Account ID", type: "number" },
    { key: "ownerId", label: "Owner (user ID)", type: "number" },
    { key: "personStageId", label: "Person stage ID", type: "number" },
    { key: "phone", label: "Phone", type: "string" },
    { key: "mobilePhone", label: "Mobile phone", type: "string" },
    { key: "linkedinUrl", label: "LinkedIn URL", type: "string" },
    { key: "doNotContact", label: "Do not contact", type: "boolean" },
    {
      key: "additionalFields",
      label: "Additional fields",
      type: "json",
      advanced: true,
      hint: "Object of Salesloft person field names → values, merged into the payload.",
    },
  ],
  output: [{ key: "data", type: "object", label: "Person" }],

  async execute(input, ctx) {
    const client = new SalesloftClient(ctx);
    return await client.request(`/people/${input.id}`, {
      method: "PUT",
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

export default personUpdate;
