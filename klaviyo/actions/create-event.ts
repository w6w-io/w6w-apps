import type { ActionDefinition } from "@w6w/types";
import { KlaviyoClient, type KlaviyoEnvelope } from "../lib/client.ts";

interface ProfileIdentifier {
  email?: string;
  phoneNumber?: string;
  externalId?: string;
  firstName?: string;
  lastName?: string;
  properties?: Record<string, unknown>;
}

interface Input {
  metricName: string;
  properties: Record<string, unknown>;
  profile: ProfileIdentifier;
  time?: string;
  value?: number;
  valueCurrency?: string;
  uniqueId?: string;
}

/**
 * Track a customer event. This is the modern replacement for the legacy
 * "Track" endpoint. Body is a nested JSON:API envelope with `metric`,
 * `profile`, and free-form `properties`. Klaviyo returns 202 Accepted on
 * success — the event is enqueued for asynchronous processing.
 */
const createEvent: ActionDefinition<Input, KlaviyoEnvelope | void> = {
  key: "create-event",
  type: "perform",
  resource: "event",
  title: "Create Event",
  description: "Record a customer event (\"track\") — creates the metric on first sight.",
  params: [
    {
      key: "metricName",
      label: "Metric name",
      type: "string",
      required: true,
      placeholder: "Placed Order",
    },
    {
      key: "properties",
      label: "Event properties",
      type: "json",
      required: true,
      hint: "Free-form key/value pairs describing this event instance.",
    },
    {
      key: "profile",
      label: "Profile",
      type: "json",
      required: true,
      hint:
        "Identify the profile, e.g. `{ \"email\": \"a@x.com\" }`. Optional identifiers: `phoneNumber`, `externalId`, plus `firstName`, `lastName`, `properties`.",
    },
    { key: "time", label: "Time (ISO 8601)", type: "datetime" },
    { key: "value", label: "Value", type: "number" },
    { key: "valueCurrency", label: "Value currency (ISO 4217)", type: "string" },
    { key: "uniqueId", label: "Unique ID (idempotency)", type: "string" },
  ],

  async execute(input, ctx) {
    const client = new KlaviyoClient(ctx);

    const profileAttrs: Record<string, unknown> = {};
    if (input.profile.email) profileAttrs.email = input.profile.email;
    if (input.profile.phoneNumber) profileAttrs.phone_number = input.profile.phoneNumber;
    if (input.profile.externalId) profileAttrs.external_id = input.profile.externalId;
    if (input.profile.firstName) profileAttrs.first_name = input.profile.firstName;
    if (input.profile.lastName) profileAttrs.last_name = input.profile.lastName;
    if (input.profile.properties) profileAttrs.properties = input.profile.properties;

    const attributes: Record<string, unknown> = {
      properties: input.properties,
      metric: {
        data: {
          type: "metric",
          attributes: { name: input.metricName },
        },
      },
      profile: {
        data: {
          type: "profile",
          attributes: profileAttrs,
        },
      },
    };
    if (input.time) attributes.time = input.time;
    if (input.value !== undefined) attributes.value = input.value;
    if (input.valueCurrency) attributes.value_currency = input.valueCurrency;
    if (input.uniqueId) attributes.unique_id = input.uniqueId;

    return client.request<KlaviyoEnvelope | void>(`/events/`, {
      method: "POST",
      body: {
        data: {
          type: "event",
          attributes,
        },
      },
    });
  },
};

export default createEvent;
