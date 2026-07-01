import type { ActionDefinition } from "@w6w/types";
import { KlaviyoClient, type KlaviyoEnvelope } from "../lib/client.ts";

interface ProfileToSubscribe {
  email?: string;
  phoneNumber?: string;
  externalId?: string;
  /** Klaviyo profile ID. Set instead of email/phone/externalId to reference an existing profile. */
  id?: string;
  /** If omitted, Klaviyo uses list defaults; explicit `SUBSCRIBED` opts them in. */
  emailConsent?: "SUBSCRIBED" | "UNSUBSCRIBED";
  smsConsent?: "SUBSCRIBED" | "UNSUBSCRIBED";
}

interface Input {
  listId?: string;
  customSource?: string;
  profiles: ProfileToSubscribe[];
  historicalImport?: boolean;
}

/**
 * Async bulk subscribe. Klaviyo returns 202 Accepted with a job resource; poll
 * the returned job id if you need completion status. Body shape is documented
 * under `/profile-subscription-bulk-create-jobs`.
 */
const subscribeProfiles: ActionDefinition<Input, KlaviyoEnvelope> = {
  key: "subscribe-profiles",
  type: "perform",
  resource: "profile",
  title: "Subscribe Profiles",
  description: "Bulk-subscribe profiles to email and/or SMS marketing, optionally added to a list.",
  params: [
    {
      key: "listId",
      label: "List ID",
      type: "string",
      hint: "Also add subscribers to this list. Optional.",
    },
    {
      key: "customSource",
      label: "Custom source",
      type: "string",
      hint: "Free-form label describing where the consent originated.",
    },
    {
      key: "profiles",
      label: "Profiles",
      type: "json",
      required: true,
      hint:
        "Array of `{ email?, phoneNumber?, externalId?, id?, emailConsent?, smsConsent? }`. At least one identifier per profile.",
    },
    {
      key: "historicalImport",
      label: "Historical import",
      type: "boolean",
      default: false,
      hint: "Skips double opt-in confirmation. Only enable for pre-consented data.",
    },
  ],

  async execute(input, ctx) {
    const client = new KlaviyoClient(ctx);
    const profiles = input.profiles.map((p) => {
      const attributes: Record<string, unknown> = {};
      if (p.email) attributes.email = p.email;
      if (p.phoneNumber) attributes.phone_number = p.phoneNumber;
      if (p.externalId) attributes.external_id = p.externalId;

      const subscriptions: Record<string, unknown> = {};
      if (p.emailConsent) {
        subscriptions.email = { marketing: { consent: p.emailConsent } };
      }
      if (p.smsConsent) {
        subscriptions.sms = { marketing: { consent: p.smsConsent } };
      }
      if (Object.keys(subscriptions).length > 0) {
        attributes.subscriptions = subscriptions;
      }

      const entry: Record<string, unknown> = { type: "profile", attributes };
      if (p.id) entry.id = p.id;
      return entry;
    });

    const attributes: Record<string, unknown> = {
      profiles: { data: profiles },
      historical_import: input.historicalImport ?? false,
    };
    if (input.customSource) attributes.custom_source = input.customSource;

    const body: Record<string, unknown> = {
      data: {
        type: "profile-subscription-bulk-create-job",
        attributes,
      },
    };
    if (input.listId) {
      (body.data as Record<string, unknown>).relationships = {
        list: { data: { type: "list", id: input.listId } },
      };
    }

    return client.request<KlaviyoEnvelope>(`/profile-subscription-bulk-create-jobs/`, {
      method: "POST",
      body,
    });
  },
};

export default subscribeProfiles;
