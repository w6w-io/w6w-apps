import type { ActionDefinition } from "@w6w/types";
import { KlaviyoClient, type KlaviyoEnvelope } from "../lib/client.ts";

interface Input {
  profileId: string;
  additionalFields?: string;
  include?: string;
}

const getProfile: ActionDefinition<Input, KlaviyoEnvelope> = {
  key: "get-profile",
  type: "read",
  resource: "profile",
  title: "Get Profile",
  description: "Retrieve a single Klaviyo profile by ID.",
  params: [
    { key: "profileId", label: "Profile ID", type: "string", required: true },
    {
      key: "additionalFields",
      label: "Additional fields (comma-separated)",
      type: "string",
      hint: "e.g. `predictive_analytics,subscriptions`. Passed as `additional-fields[profile]`.",
    },
    {
      key: "include",
      label: "Include (comma-separated)",
      type: "string",
      hint: "Side-load relationships, e.g. `lists,segments`.",
    },
  ],

  async execute(input, ctx) {
    const client = new KlaviyoClient(ctx);
    return client.request<KlaviyoEnvelope>(`/profiles/${input.profileId}/`, {
      query: {
        "additional-fields[profile]": input.additionalFields,
        include: input.include,
      },
    });
  },
};

export default getProfile;
