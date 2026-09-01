import type { ActionDefinition } from "@w6w/types";
import { compact, customField, FreshsalesClient, unset } from "../lib/client.ts";
import { contactOutput } from "../lib/params.ts";

interface Input {
  firstName?: string;
  lastName?: string;
  email?: string;
  mobileNumber?: string;
  workNumber?: string;
  jobTitle?: string;
  salesAccountId?: number;
  customField?: unknown;
}

const contactCreate: ActionDefinition<Input> = {
  key: "contact-create",
  type: "perform",
  resource: "contact",
  title: "Create Contact",
  description: "Create a contact.",
  idempotent: false,
  params: [
    { key: "firstName", label: "First name", type: "string", row: "name" },
    { key: "lastName", label: "Last name", type: "string", row: "name" },
    { key: "email", label: "Email", type: "string", row: "identify" },
    { key: "mobileNumber", label: "Mobile number", type: "string", row: "identify" },
    { key: "workNumber", label: "Work number", type: "string", advanced: true },
    { key: "jobTitle", label: "Job title", type: "string", advanced: true },
    {
      key: "salesAccountId",
      label: "Account ID",
      type: "number",
      advanced: true,
      hint: "Associate the contact with an existing account (Sales Account).",
    },
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
    return new FreshsalesClient(ctx).resource("contact", "/contacts", {
      method: "POST",
      body: {
        contact: compact({
          first_name: unset(input.firstName),
          last_name: unset(input.lastName),
          email: unset(input.email),
          mobile_number: unset(input.mobileNumber),
          work_number: unset(input.workNumber),
          job_title: unset(input.jobTitle),
          sales_account_id: input.salesAccountId,
          custom_field: customField(input.customField),
        }),
      },
    });
  },
};

export default contactCreate;
