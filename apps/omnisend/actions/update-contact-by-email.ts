import type { ActionDefinition } from "@w6w/types";
import { OmnisendClient } from "../lib/client.ts";

interface Input {
  email: string;
  firstName?: string;
  lastName?: string;
  gender?: "m" | "f";
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  countryCode?: string;
  postalCode?: string;
  birthdate?: string;
  tags?: string[];
  customProperties?: Record<string, unknown>;
}

/** https://api-docs.omnisend.com/reference/patch_contacts */
const updateContactByEmail: ActionDefinition<Input> = {
  key: "update-contact-by-email",
  type: "perform",
  resource: "contact",
  title: "Update Contact by Email",
  description: "Update the contact matching the given email address. 404 if none exists.",
  idempotent: true,
  params: [
    { key: "email", label: "Email", type: "string", required: true },
    { key: "firstName", label: "First name", type: "string" },
    { key: "lastName", label: "Last name", type: "string" },
    {
      key: "gender",
      label: "Gender",
      type: "select",
      options: [{ value: "m", label: "Male" }, { value: "f", label: "Female" }],
    },
    { key: "address", label: "Address", type: "string" },
    { key: "city", label: "City", type: "string" },
    { key: "state", label: "State / region", type: "string" },
    { key: "country", label: "Country name", type: "string" },
    { key: "countryCode", label: "Country code (ISO 3166-1 alpha-2)", type: "string" },
    { key: "postalCode", label: "Postal code", type: "string" },
    { key: "birthdate", label: "Birthdate (YYYY-MM-DD)", type: "string" },
    { key: "tags", label: "Tags", type: "json", hint: 'Array of strings, e.g. `["vip"]`.' },
    { key: "customProperties", label: "Custom properties", type: "json" },
  ],

  execute(input, ctx) {
    const client = new OmnisendClient(ctx);
    return client.request(`/contacts`, {
      method: "PATCH",
      query: { email: input.email },
      body: {
        firstName: input.firstName,
        lastName: input.lastName,
        gender: input.gender,
        address: input.address,
        city: input.city,
        state: input.state,
        country: input.country,
        countryCode: input.countryCode,
        postalCode: input.postalCode,
        birthdate: input.birthdate,
        tags: input.tags,
        customProperties: input.customProperties,
      },
    });
  },
};

export default updateContactByEmail;
