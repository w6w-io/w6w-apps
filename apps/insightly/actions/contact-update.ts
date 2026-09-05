import type { ActionDefinition } from "@w6w/types";
import { compact, InsightlyClient, unset } from "../lib/client.ts";

interface Input {
  contactId: number;
  firstName?: string;
  lastName?: string;
  salutation?: string;
  title?: string;
  emailAddress?: string;
  phone?: string;
  phoneMobile?: string;
  organisationId?: number;
  background?: string;
}

/**
 * Insightly's v3.1 PUT semantics (verified against `v3.1/help`'s "Write/Update
 * Requests" section): "Records can now be updated with the record ID field
 * and the fields you want to set or edit" — untouched fields are left alone,
 * so only the fields actually set here are sent, alongside the id.
 */
const contactUpdate: ActionDefinition<Input> = {
  key: "contact-update",
  type: "perform",
  resource: "contact",
  title: "Update Contact",
  description: "Change a contact's fields. Only the ones you set are touched.",
  idempotent: true,
  params: [
    { key: "contactId", label: "Contact ID", type: "number", required: true },
    { key: "firstName", label: "First name", type: "string", row: "name" },
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
      method: "PUT",
      body: compact({
        CONTACT_ID: input.contactId,
        FIRST_NAME: unset(input.firstName),
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

export default contactUpdate;
