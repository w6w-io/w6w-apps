import type { ActionDefinition } from "@w6w/types";
import { compact, customField, FreshsalesClient, unset } from "../lib/client.ts";
import { contactOutput } from "../lib/params.ts";

interface Input {
  contactId: number;
  firstName?: string;
  lastName?: string;
  email?: string;
  mobileNumber?: string;
  workNumber?: string;
  jobTitle?: string;
  customField?: unknown;
}

const contactUpdate: ActionDefinition<Input> = {
  key: "contact-update",
  type: "perform",
  resource: "contact",
  title: "Update Contact",
  description: "Update a contact. Only fields you set are changed.",
  idempotent: true,
  params: [
    { key: "contactId", label: "Contact ID", type: "number", required: true },
    { key: "firstName", label: "First name", type: "string", row: "name" },
    { key: "lastName", label: "Last name", type: "string", row: "name" },
    { key: "email", label: "Email", type: "string", row: "identify" },
    { key: "mobileNumber", label: "Mobile number", type: "string", row: "identify" },
    { key: "workNumber", label: "Work number", type: "string", advanced: true },
    { key: "jobTitle", label: "Job title", type: "string", advanced: true },
    {
      key: "customField",
      label: "Custom field",
      type: "json",
      advanced: true,
      hint: '{ "cf_is_active": true }',
    },
  ],
  output: contactOutput,

  execute(input, ctx) {
    return new FreshsalesClient(ctx).resource("contact", `/contacts/${input.contactId}`, {
      method: "PUT",
      body: {
        contact: compact({
          first_name: unset(input.firstName),
          last_name: unset(input.lastName),
          email: unset(input.email),
          mobile_number: unset(input.mobileNumber),
          work_number: unset(input.workNumber),
          job_title: unset(input.jobTitle),
          custom_field: customField(input.customField),
        }),
      },
    });
  },
};

export default contactUpdate;
