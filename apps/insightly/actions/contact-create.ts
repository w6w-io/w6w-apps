import type { ActionDefinition } from "@w6w/types";
import { compact, InsightlyClient, unset } from "../lib/client.ts";

interface Input {
  firstName: string;
  lastName?: string;
  salutation?: string;
  title?: string;
  emailAddress?: string;
  phone?: string;
  phoneMobile?: string;
  organisationId?: number;
  background?: string;
}

const contactCreate: ActionDefinition<Input> = {
  key: "contact-create",
  type: "perform",
  resource: "contact",
  title: "Create Contact",
  description: "Create a contact.",
  idempotent: false,
  params: [
    { key: "firstName", label: "First name", type: "string", required: true, row: "name" },
    { key: "lastName", label: "Last name", type: "string", row: "name" },
    { key: "salutation", label: "Salutation", type: "string", advanced: true },
    { key: "title", label: "Job title", type: "string" },
    { key: "emailAddress", label: "Email", type: "string", row: "contact" },
    { key: "phone", label: "Phone", type: "string", row: "contact" },
    { key: "phoneMobile", label: "Mobile", type: "string", row: "contact" },
    { key: "organisationId", label: "Organisation ID", type: "number" },
    { key: "background", label: "Background", type: "text", advanced: true },
  ],
  output: [
    { key: "CONTACT_ID", type: "number", label: "Contact ID" },
    { key: "FIRST_NAME", type: "string", label: "First name" },
    { key: "LAST_NAME", type: "string", label: "Last name" },
  ],

  execute(input, ctx) {
    return new InsightlyClient(ctx).request("/Contacts", {
      method: "POST",
      body: compact({
        FIRST_NAME: input.firstName,
        LAST_NAME: unset(input.lastName),
        SALUTATION: unset(input.salutation),
        TITLE: unset(input.title),
        EMAIL_ADDRESS: unset(input.emailAddress),
        PHONE: unset(input.phone),
        PHONE_MOBILE: unset(input.phoneMobile),
        ORGANISATION_ID: input.organisationId,
        BACKGROUND: unset(input.background),
      }),
    });
  },
};

export default contactCreate;
