import type { ActionDefinition } from "@w6w/types";
import { KlaviyoClient, type KlaviyoEnvelope } from "../lib/client.ts";

interface ProfileToUnsubscribe {
  email?: string;
  phoneNumber?: string;
  id?: string;
}

interface Input {
  listId?: string;
  profiles: ProfileToUnsubscribe[];
  channels?: Array<"email" | "sms">;
}

/**
 * Async bulk unsubscribe from email and/or SMS. Optionally scoped to a list.
 * Endpoint: `/profile-subscription-bulk-delete-jobs`.
 */
const unsubscribeProfiles: ActionDefinition<Input, KlaviyoEnvelope> = {
  key: "unsubscribe-profiles",
  type: "perform",
  resource: "profile",
  title: "Unsubscribe Profiles",
  description: "Bulk-unsubscribe profiles from email and/or SMS marketing.",
  params: [
    { key: "listId", label: "List ID", type: "string" },
    {
      key: "profiles",
      label: "Profiles",
      type: "json",
      required: true,
      hint: "Array of `{ email?, phoneNumber?, id? }`.",
    },
    {
      key: "channels",
      label: "Channels",
      type: "multiselect",
      options: [
        { value: "email", label: "Email" },
        { value: "sms", label: "SMS" },
      ],
      default: ["email"],
      hint: "Which subscription channels to revoke.",
    },
  ],

  async execute(input, ctx) {
    const client = new KlaviyoClient(ctx);
    const channels = input.channels?.length ? input.channels : ["email"];

    const profiles = input.profiles.map((p) => {
      const attributes: Record<string, unknown> = {};
      if (p.email) attributes.email = p.email;
      if (p.phoneNumber) attributes.phone_number = p.phoneNumber;

      const subscriptions: Record<string, unknown> = {};
      if (channels.includes("email")) subscriptions.email = { marketing: {} };
      if (channels.includes("sms")) subscriptions.sms = { marketing: {} };
      if (Object.keys(subscriptions).length > 0) {
        attributes.subscriptions = subscriptions;
      }

      const entry: Record<string, unknown> = { type: "profile", attributes };
      if (p.id) entry.id = p.id;
      return entry;
    });

    const body: Record<string, unknown> = {
      data: {
        type: "profile-subscription-bulk-delete-job",
        attributes: { profiles: { data: profiles } },
      },
    };
    if (input.listId) {
      (body.data as Record<string, unknown>).relationships = {
        list: { data: { type: "list", id: input.listId } },
      };
    }

    return client.request<KlaviyoEnvelope>(`/profile-subscription-bulk-delete-jobs/`, {
      method: "POST",
      body,
    });
  },
};

export default unsubscribeProfiles;
