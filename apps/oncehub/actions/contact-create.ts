import type { ActionDefinition } from "@w6w/types";
import { OnceHubClient } from "../lib/client.ts";

interface Input {
  firstName: string;
  lastName: string;
  email?: string;
  mobilePhone?: string;
  company?: string;
  jobTitle?: string;
  status?: string;
  city?: string;
  state?: string;
  country?: string;
  timezone?: string;
}

/**
 * POST /contacts. Either `email` or `mobilePhone` is required — the API
 * itself enforces this (400 if both are missing), it is not just a form hint.
 */
const contactCreate: ActionDefinition<Input> = {
  key: "contact-create",
  type: "perform",
  resource: "contact",
  title: "Add Contact",
  description:
    "Create a new contact (POST /contacts). Requires email or mobile phone (at least one).",
  idempotent: false,
  output: [
    { key: "id", type: "string", label: "Contact ID" },
    { key: "email", type: "string", label: "Email" },
    { key: "first_name", type: "string", label: "First name" },
    { key: "last_name", type: "string", label: "Last name" },
  ],
  params: [
    { key: "firstName", label: "First name", type: "string", required: true, row: "name" },
    { key: "lastName", label: "Last name", type: "string", required: true, row: "name" },
    { key: "email", label: "Email", type: "string", row: "identity" },
    {
      key: "mobilePhone",
      label: "Mobile phone",
      type: "string",
      row: "identity",
      hint: "E.164 format.",
    },
    { key: "company", label: "Company", type: "string", advanced: true },
    { key: "jobTitle", label: "Job title", type: "string", advanced: true },
    {
      key: "status",
      label: "Status",
      type: "select",
      advanced: true,
      options: [
        { label: "Qualified", value: "Qualified" },
        { label: "Sales qualified", value: "Sales qualified" },
        { label: "Marketing qualified", value: "Marketing qualified" },
        { label: "Disqualified", value: "Disqualified" },
      ],
    },
    { key: "city", label: "City", type: "string", advanced: true },
    { key: "state", label: "State", type: "string", advanced: true },
    { key: "country", label: "Country", type: "string", advanced: true },
    { key: "timezone", label: "Timezone", type: "string", advanced: true, hint: "IANA timezone." },
  ],

  execute(input, ctx) {
    return new OnceHubClient(ctx).request("/contacts", {
      method: "POST",
      body: {
        first_name: input.firstName,
        last_name: input.lastName,
        email: input.email,
        mobile_phone: input.mobilePhone,
        company: input.company,
        job_title: input.jobTitle,
        status: input.status,
        city: input.city,
        state: input.state,
        country: input.country,
        timezone: input.timezone,
      },
    });
  },
};

export default contactCreate;
