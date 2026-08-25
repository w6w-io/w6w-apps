import type { ActionDefinition } from "@w6w/types";
import { OnceHubClient } from "../lib/client.ts";

interface Input {
  id: string;
  firstName?: string;
  lastName?: string;
  owner?: string;
  status?: string;
  company?: string;
  jobTitle?: string;
  phone?: string;
  city?: string;
  state?: string;
  country?: string;
  postCode?: string;
  streetAddress?: string;
  timezone?: string;
  customFields?: unknown;
}

/**
 * PATCH /contacts/{id}. At least one field is required. `email` and
 * `mobile_phone` are the contact's identifier fields and CANNOT be changed
 * through this endpoint (400 `Identifier field error`) — create a new
 * contact instead. `customFields` only updates the fields provided
 * (partial updates), it does not replace the whole set.
 */
const contactUpdate: ActionDefinition<Input> = {
  key: "contact-update",
  type: "perform",
  resource: "contact",
  title: "Update Contact",
  description:
    "Update an existing contact (PATCH /contacts/{id}). At least one field is required. email/mobile_phone cannot be changed here.",
  idempotent: true,
  output: [
    { key: "id", type: "string", label: "Contact ID" },
    { key: "last_updated_time", type: "string", label: "Last updated time" },
  ],
  params: [
    { key: "id", label: "Contact ID", type: "string", required: true },
    { key: "firstName", label: "First name", type: "string", row: "name" },
    { key: "lastName", label: "Last name", type: "string", row: "name" },
    { key: "owner", label: "Owner user ID", type: "string" },
    {
      key: "status",
      label: "Status",
      type: "select",
      options: [
        { label: "Qualified", value: "Qualified" },
        { label: "Sales qualified", value: "Sales qualified" },
        { label: "Marketing qualified", value: "Marketing qualified" },
        { label: "Disqualified", value: "Disqualified" },
      ],
    },
    { key: "company", label: "Company", type: "string", advanced: true },
    { key: "jobTitle", label: "Job title", type: "string", advanced: true },
    { key: "phone", label: "Phone", type: "string", advanced: true, hint: "E.164 format." },
    { key: "city", label: "City", type: "string", advanced: true },
    { key: "state", label: "State", type: "string", advanced: true },
    { key: "country", label: "Country", type: "string", advanced: true },
    { key: "postCode", label: "Postal code", type: "string", advanced: true },
    { key: "streetAddress", label: "Street address", type: "string", advanced: true },
    { key: "timezone", label: "Timezone", type: "string", advanced: true },
    {
      key: "customFields",
      label: "Custom fields",
      type: "json",
      advanced: true,
      hint:
        '[{ "name": "resume", "value": "https://…" }] — partial update, only listed fields change.',
    },
  ],

  execute(input, ctx) {
    return new OnceHubClient(ctx).request(`/contacts/${encodeURIComponent(input.id)}`, {
      method: "PATCH",
      body: {
        first_name: input.firstName,
        last_name: input.lastName,
        owner: input.owner,
        status: input.status,
        company: input.company,
        job_title: input.jobTitle,
        phone: input.phone,
        city: input.city,
        state: input.state,
        country: input.country,
        post_code: input.postCode,
        street_address: input.streetAddress,
        timezone: input.timezone,
        custom_fields: input.customFields,
      },
    });
  },
};

export default contactUpdate;
