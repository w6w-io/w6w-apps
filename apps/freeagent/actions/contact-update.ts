import type { ActionDefinition } from "@w6w/types";
import { compact, FreeAgentClient, jsonObject } from "../lib/client.ts";

interface Input {
  contactId: string;
  firstName?: string;
  lastName?: string;
  organisationName?: string;
  email?: string;
  additionalFields?: unknown;
}

const contactUpdate: ActionDefinition<Input> = {
  key: "contact-update",
  type: "perform",
  resource: "contact",
  title: "Update Contact",
  description: "Update fields on an existing contact.",
  // A PUT is a full replace of the fields it names; sending the same body
  // twice leaves the contact in the same state, so retrying is safe.
  idempotent: true,
  params: [
    { key: "contactId", label: "Contact ID", type: "string", required: true },
    { key: "firstName", label: "First name", type: "string" },
    { key: "lastName", label: "Last name", type: "string" },
    { key: "organisationName", label: "Organisation name", type: "string" },
    { key: "email", label: "Email", type: "string" },
    {
      key: "additionalFields",
      label: "Additional fields",
      type: "json",
      advanced: true,
      hint: "Merged into the contact object using FreeAgent's field names.",
    },
  ],
  output: [{ key: "contact", type: "object", label: "Contact" }],

  execute(input, ctx) {
    return new FreeAgentClient(ctx).request(`/contacts/${input.contactId}`, {
      method: "PUT",
      body: {
        contact: {
          ...compact({
            first_name: input.firstName,
            last_name: input.lastName,
            organisation_name: input.organisationName,
            email: input.email,
          }),
          ...jsonObject(input.additionalFields, "additionalFields"),
        },
      },
    });
  },
};

export default contactUpdate;
