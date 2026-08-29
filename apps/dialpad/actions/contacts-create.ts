import type { ActionDefinition } from "@w6w/types";
import { DialpadClient } from "../lib/client.ts";
import { toStringArray } from "../lib/params.ts";

/**
 * `POST /api/v2/contacts` — create a new shared (company) or local (one
 * user's, via Owner ID) contact.
 *
 * No idempotency key is documented, so calling this twice creates two
 * contacts.
 */
interface Input {
  firstName: string;
  lastName: string;
  companyName?: string;
  jobTitle?: string;
  emails?: string;
  phones?: string;
  urls?: string;
  extension?: string;
  ownerId?: string;
}

const contactsCreate: ActionDefinition<Input> = {
  key: "contacts-create",
  type: "perform",
  resource: "contact",
  title: "Create Contact",
  description:
    "Create a new contact. Provide Owner user ID to create a local contact for that user " +
    "instead of a shared company contact.",
  idempotent: false,
  params: [
    { key: "firstName", label: "First name", type: "string", required: true },
    { key: "lastName", label: "Last name", type: "string", required: true },
    { key: "companyName", label: "Company name", type: "string" },
    { key: "jobTitle", label: "Job title", type: "string" },
    {
      key: "emails",
      label: "Emails",
      type: "string",
      hint: "Comma-separated. The first is the contact's primary email.",
    },
    {
      key: "phones",
      label: "Phone numbers",
      type: "string",
      hint: "Comma-separated, E164 format. The first is the contact's primary phone.",
    },
    { key: "urls", label: "Websites", type: "string", hint: "Comma-separated." },
    { key: "extension", label: "Extension", type: "string" },
    {
      key: "ownerId",
      label: "Owner user ID",
      type: "string",
      hint: "Create a local contact owned by this user instead of a shared company contact.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Contact ID" },
    { key: "display_name", type: "string", label: "Display name" },
  ],

  execute(input, ctx) {
    return new DialpadClient(ctx).json("/contacts", {
      method: "POST",
      body: {
        first_name: input.firstName,
        last_name: input.lastName,
        company_name: input.companyName,
        job_title: input.jobTitle,
        emails: toStringArray(input.emails),
        phones: toStringArray(input.phones),
        urls: toStringArray(input.urls),
        extension: input.extension,
        owner_id: input.ownerId,
      },
    });
  },
};

export default contactsCreate;
