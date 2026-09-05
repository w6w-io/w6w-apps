import type { ActionDefinition } from "@w6w/types";
import { OmnisendClient } from "../lib/client.ts";

interface Input {
  identifiers: Array<Record<string, unknown>>;
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

/**
 * Creates a new contact, or updates it if a contact with the given email
 * identifier already exists — the response status (201 vs 200) tells you
 * which happened, but the body shape is identical either way.
 * https://api-docs.omnisend.com/reference/post_contacts
 */
const createOrUpdateContact: ActionDefinition<Input> = {
  key: "create-or-update-contact",
  type: "perform",
  resource: "contact",
  title: "Create or Update Contact",
  description:
    "Create a contact, or update it if a contact with the same email identifier already exists.",
  idempotent: true,
  params: [
    {
      key: "identifiers",
      label: "Identifiers",
      type: "json",
      required: true,
      hint:
        'Array of `{ type: "email"|"phone", id, channels?: { email?: { status }, sms?: { status } } }`. e.g. `[{ "type": "email", "id": "a@b.com", "channels": { "email": { "status": "subscribed" } } }]`.',
    },
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
    {
      key: "tags",
      label: "Tags",
      type: "json",
      hint: 'Array of strings, e.g. `["source: api"]`. A source tag is strongly recommended.',
    },
    { key: "customProperties", label: "Custom properties", type: "json" },
  ],

  execute(input, ctx) {
    const client = new OmnisendClient(ctx);
    return client.request(`/contacts`, {
      method: "POST",
      body: {
        identifiers: input.identifiers,
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

export default createOrUpdateContact;
