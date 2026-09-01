import type { ActionDefinition } from "@w6w/types";
import { compact, FreeAgentClient, jsonObject } from "../lib/client.ts";

interface Input {
  firstName?: string;
  lastName?: string;
  organisationName?: string;
  email?: string;
  additionalFields?: unknown;
}

const contactCreate: ActionDefinition<Input> = {
  key: "contact-create",
  type: "perform",
  resource: "contact",
  title: "Create Contact",
  description:
    "Create a new contact (customer or supplier). Provide either an organisation name, or a first and last name.",
  // FreeAgent mints a new contact id per call and offers no request key, so
  // a retry creates a duplicate contact.
  idempotent: false,
  params: [
    { key: "firstName", label: "First name", type: "string" },
    { key: "lastName", label: "Last name", type: "string" },
    { key: "organisationName", label: "Organisation name", type: "string" },
    { key: "email", label: "Email", type: "string" },
    {
      key: "additionalFields",
      label: "Additional fields",
      type: "json",
      advanced: true,
      hint:
        'Merged into the contact object using FreeAgent\'s field names, e.g. { "phone_number": "12345678", "address1": "11 George Street", "town": "London" }.',
    },
  ],
  output: [{ key: "contact", type: "object", label: "Contact" }],

  execute(input, ctx) {
    return new FreeAgentClient(ctx).request("/contacts", {
      method: "POST",
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

export default contactCreate;
