import type { ActionDefinition } from "@w6w/types";
import { KlaviyoClient, type KlaviyoEnvelope } from "../lib/client.ts";

interface Input {
  profileId: string;
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
 * PATCH the profile — the JSON:API envelope must carry the `id` field inside
 * `data` alongside `type` and `attributes`. Only fields present in `attributes`
 * are updated; omitted fields are left alone.
 */
const updateProfile: ActionDefinition<Input, KlaviyoEnvelope> = {
  key: "update-profile",
  type: "perform",
  resource: "profile",
  title: "Update Profile",
  description: "Update fields on an existing Klaviyo profile.",
  params: [
    { key: "profileId", label: "Profile ID", type: "string", required: true },
    { key: "email", label: "Email", type: "string" },
    { key: "phoneNumber", label: "Phone (E.164)", type: "string" },
    { key: "externalId", label: "External ID", type: "string" },
    { key: "firstName", label: "First Name", type: "string" },
    { key: "lastName", label: "Last Name", type: "string" },
    { key: "organization", label: "Organization", type: "string" },
    { key: "title", label: "Title", type: "string" },
    { key: "image", label: "Image URL", type: "string" },
    { key: "location", label: "Location", type: "json" },
    { key: "properties", label: "Custom Properties", type: "json" },
  ],

  async execute(input, ctx) {
    const client = new KlaviyoClient(ctx);
    const attributes: Record<string, unknown> = {};
    if (input.email !== undefined) attributes.email = input.email;
    if (input.phoneNumber !== undefined) attributes.phone_number = input.phoneNumber;
    if (input.externalId !== undefined) attributes.external_id = input.externalId;
    if (input.firstName !== undefined) attributes.first_name = input.firstName;
    if (input.lastName !== undefined) attributes.last_name = input.lastName;
    if (input.organization !== undefined) attributes.organization = input.organization;
    if (input.title !== undefined) attributes.title = input.title;
    if (input.image !== undefined) attributes.image = input.image;
    if (input.location !== undefined) attributes.location = input.location;
    if (input.properties !== undefined) attributes.properties = input.properties;

    return client.request<KlaviyoEnvelope>(`/profiles/${input.profileId}/`, {
      method: "PATCH",
      body: {
        data: {
          type: "profile",
          id: input.profileId,
          attributes,
        },
      },
    });
  },
};

export default updateProfile;
