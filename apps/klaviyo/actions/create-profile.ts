import type { ActionDefinition } from "@w6w/types";
import { KlaviyoClient, type KlaviyoEnvelope } from "../lib/client.ts";

interface Input {
  email?: string;
  phoneNumber?: string;
  externalId?: string;
  firstName?: string;
  lastName?: string;
  organization?: string;
  title?: string;
  image?: string;
  location?: Record<string, unknown>;
  properties?: Record<string, unknown>;
}

/**
 * Klaviyo wraps every write in a JSON:API envelope: `{ data: { type, attributes } }`.
 * We build that envelope here from flat inputs.
 */
const createProfile: ActionDefinition<Input, KlaviyoEnvelope> = {
  key: "create-profile",
  type: "perform",
  resource: "profile",
  title: "Create Profile",
  description: "Create a new Klaviyo profile. At least one of email / phone / externalId is required.",
  params: [
    { key: "email", label: "Email", type: "string" },
    { key: "phoneNumber", label: "Phone (E.164)", type: "string", placeholder: "+15551234567" },
    { key: "externalId", label: "External ID", type: "string" },
    { key: "firstName", label: "First Name", type: "string" },
    { key: "lastName", label: "Last Name", type: "string" },
    { key: "organization", label: "Organization", type: "string" },
    { key: "title", label: "Title", type: "string" },
    { key: "image", label: "Image URL", type: "string" },
    {
      key: "location",
      label: "Location",
      type: "json",
      hint: "e.g. `{ \"city\": \"Boston\", \"country\": \"USA\", \"zip\": \"02116\" }`.",
    },
    {
      key: "properties",
      label: "Custom Properties",
      type: "json",
      hint: "Free-form key/value pairs stored on the profile.",
    },
  ],

  async execute(input, ctx) {
    const client = new KlaviyoClient(ctx);
    const attributes: Record<string, unknown> = {};
    if (input.email) attributes.email = input.email;
    if (input.phoneNumber) attributes.phone_number = input.phoneNumber;
    if (input.externalId) attributes.external_id = input.externalId;
    if (input.firstName) attributes.first_name = input.firstName;
    if (input.lastName) attributes.last_name = input.lastName;
    if (input.organization) attributes.organization = input.organization;
    if (input.title) attributes.title = input.title;
    if (input.image) attributes.image = input.image;
    if (input.location) attributes.location = input.location;
    if (input.properties) attributes.properties = input.properties;

    return client.request<KlaviyoEnvelope>(`/profiles/`, {
      method: "POST",
      body: {
        data: {
          type: "profile",
          attributes,
        },
      },
    });
  },
};

export default createProfile;
