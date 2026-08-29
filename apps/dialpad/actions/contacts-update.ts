import type { ActionDefinition } from "@w6w/types";
import { DialpadClient, encodeId } from "../lib/client.ts";
import { toStringArray } from "../lib/params.ts";

/**
 * `PATCH /api/v2/contacts/{id}` — update fields on an existing contact.
 *
 * List fields (`emails`, `phones`, `urls`) are replaced wholesale, so sending
 * the same body twice ends in the same state — declared idempotent.
 */
interface Input {
  contactId: string;
  firstName?: string;
  lastName?: string;
  companyName?: string;
  jobTitle?: string;
  emails?: string;
  phones?: string;
  urls?: string;
  extension?: string;
}

const contactsUpdate: ActionDefinition<Input> = {
  key: "contacts-update",
  type: "perform",
  resource: "contact",
  title: "Update Contact",
  description: "Update the provided fields for an existing contact.",
  idempotent: true,
  params: [
    { key: "contactId", label: "Contact ID", type: "string", required: true },
    { key: "firstName", label: "First name", type: "string" },
    { key: "lastName", label: "Last name", type: "string" },
    { key: "companyName", label: "Company name", type: "string" },
    { key: "jobTitle", label: "Job title", type: "string" },
    {
      key: "emails",
      label: "Emails",
      type: "string",
      hint: "Comma-separated. Replaces the full list.",
    },
    {
      key: "phones",
      label: "Phone numbers",
      type: "string",
      hint: "Comma-separated, E164 format. Replaces the full list.",
    },
    {
      key: "urls",
      label: "Websites",
      type: "string",
      hint: "Comma-separated. Replaces the full list.",
    },
    { key: "extension", label: "Extension", type: "string" },
  ],
  output: [
    { key: "id", type: "string", label: "Contact ID" },
    { key: "display_name", type: "string", label: "Display name" },
  ],

  execute(input, ctx) {
    return new DialpadClient(ctx).json(`/contacts/${encodeId(input.contactId)}`, {
      method: "PATCH",
      body: {
        first_name: input.firstName,
        last_name: input.lastName,
        company_name: input.companyName,
        job_title: input.jobTitle,
        emails: toStringArray(input.emails),
        phones: toStringArray(input.phones),
        urls: toStringArray(input.urls),
        extension: input.extension,
      },
    });
  },
};

export default contactsUpdate;
